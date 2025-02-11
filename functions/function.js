export const doctypes = ["Client Script", "Server Script"];

export function getEndPointForDoctype(doctype, url){
  
  var endpoint
  switch(doctype){
    case 'Client Script':
      endpoint = "Client Script"
      break
    case 'Server Script':
      endpoint = "Server Script"
      break
    case 'Report':
      endpoint = "Report"
      break
    case 'Custom Field':
      endpoint = "Custom Field"
      break
    case 'Letter Head':
      endpoint = "Letter Head"
      break
    case 'Print Format':
      endpoint = "Print Format"
      break
    case 'Perm':
      endpoint = "Custom DocPerm"
      break
    case 'Custom Doctype':
      endpoint = "Custom Doctype"
      break
    case 'User Permission':
      endpoint = "User Permission"
      break
    default:
      endpoint = '';
      break

  }
  const baseUrl = `${url}/api/resource/${endpoint}`
  return baseUrl
}