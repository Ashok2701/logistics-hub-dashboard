// Direct browser → Sage X3 SOAP Web Service client.
// Mirrors CBTTL's src/service.js pattern (ConfirmLVS etc.) — calls the
// SOAP endpoint straight from the browser instead of going through our
// backend's X3SoapController proxy (src/lib/x3SoapApi.ts).
//
// SECURITY NOTE: this bakes the SOAP username/password directly into the
// shipped JS bundle — visible to anyone via devtools/view-source. This
// is the same tradeoff CBTTL's original frontend had. Only use this path
// where the backend-proxy call genuinely can't reach the SOAP endpoint
// from the server's network path (e.g. the 405 seen calling X10CCONBUT
// via the backend). Also note: tmsx3em.tema-systems.com is a different
// origin than this app, so the browser enforces CORS — this only works
// if that SOAP server actually allows cross-origin requests.

const SOAP_URL      = "https://tmsx3em.tema-systems.com:8124/soap-generic/syracuse/collaboration/syracuse/CAdxWebServiceXmlCC?wsdl";
const SOAP_USERNAME = "TMSWE";
const SOAP_PASSWORD = "*Tbs@12345123";
const POOL_ALIAS    = "TMSNEW";

function buildEnvelope(publicName: string, inputXml: string): string {
  return (
    `<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wss="http://www.adonix.com/WSS" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    `<wss:run soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">` +
    `<callContext xsi:type="wss:CAdxCallContext">` +
    `<codeLang xsi:type="xsd:string">ENG</codeLang>` +
    `<poolAlias xsi:type="xsd:string">${POOL_ALIAS}</poolAlias>` +
    `<poolId xsi:type="xsd:string"></poolId>` +
    `<requestConfig xsi:type="xsd:string"></requestConfig>` +
    `</callContext>` +
    `<publicName xsi:type="xsd:string">${publicName}</publicName>` +
    `<inputXml xsi:type="xsd:string"><![CDATA[${inputXml}]]></inputXml>` +
    `</wss:run>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`
  );
}

// Mirrors the backend's parseXmlToMap(): FLD -> key/value (lowercased),
// TAB/LIN -> arrays of row objects, STATUS/MESSA -> status/message.
function parseFldMap(xmlText: string): Record<string, any> {
  try {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) return { raw: xmlText, parseError: parserError.textContent };

    const result: Record<string, any> = {};

    for (const el of Array.from(doc.getElementsByTagName("FLD"))) {
      const name = el.getAttribute("NAME");
      if (name) result[name.toLowerCase()] = el.textContent ?? "";
    }

    for (const tab of Array.from(doc.getElementsByTagName("TAB"))) {
      const tabId = tab.getAttribute("ID");
      const rows: Record<string, any>[] = [];
      for (const lin of Array.from(tab.getElementsByTagName("LIN"))) {
        const row: Record<string, any> = {};
        for (const fld of Array.from(lin.getElementsByTagName("FLD"))) {
          const n = fld.getAttribute("NAME");
          if (n) row[n.toLowerCase()] = fld.textContent ?? "";
        }
        rows.push(row);
      }
      result[tabId ? tabId.toLowerCase() : "rows"] = rows;
    }

    const status = doc.getElementsByTagName("STATUS")[0];
    if (status) result.status = status.textContent;
    const messa = doc.getElementsByTagName("MESSA")[0];
    if (messa) result.message = messa.textContent;

    return result;
  } catch (e: any) {
    return { raw: xmlText, parseError: e?.message ?? String(e) };
  }
}

async function callSoap(publicName: string, inputXml: string): Promise<Record<string, any>> {
  const envelope = buildEnvelope(publicName, inputXml);
  const auth = btoa(`${SOAP_USERNAME}:${SOAP_PASSWORD}`);

  let res: Response;
  try {
    res = await fetch(SOAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/html",   // matches CBTTL exactly — not text/xml
        "SOAPAction": "CAdxWebServiceXmlCC",
        "Authorization": `Basic ${auth}`,
      },
      body: envelope,
    });
  } catch (e: any) {
    // Most likely a CORS failure — fetch throws a generic TypeError with
    // no useful detail when a cross-origin request is blocked.
    return { error: `Network/CORS error calling SOAP endpoint directly from the browser: ${e?.message ?? e}`, publicName };
  }

  const text = await res.text();
  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${text}`, publicName };
  }

  // Extract resultXml (mirrors CBTTL: getElementsByTagName('resultXml')[0].innerHTML)
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const resultNode = doc.getElementsByTagName("resultXml")[0];
  if (!resultNode) return { raw: text, publicName };

  let resultXml = (resultNode.textContent ?? "").trim();
  if (resultXml.startsWith("<![CDATA[")) {
    resultXml = resultXml.substring(9, resultXml.length - 3);
  }

  return parseFldMap(resultXml);
}

export const x3SoapDirect = {
  /** X10CCONBUT — confirm/validate an LVS in X3, called directly from the browser */
  confirmLvs: (lvsNum: string) =>
    callSoap("X10CCONBUT", `<PARAM><FLD NAME="I_XLVSNUM" TYPE="Char">${lvsNum}</FLD></PARAM>`),

  /** X1CONFIRM — confirm the route/trip itself in X3 (I_XNUMPC = VR number), called directly from the browser */
  confirmRoute: (vrNumber: string) =>
    callSoap("X1CONFIRM", `<PARAM><FLD NAME="I_XNUMPC" TYPE="Char">${vrNumber}</FLD></PARAM>`),

  /** X10CSTKMTV — Load Truck: move stock onto the vehicle for an LVS (I_XLVSNUM = LVS number) */
  loadTruck: (lvsNum: string) =>
    callSoap("X10CSTKMTV", `<PARAM><FLD NAME="I_XLVSNUM" TYPE="Char">${lvsNum}</FLD></PARAM>`),
};
