export const countryEmergencyNumbers: Record<string, string> = {
  Indonesia:
    'Medical Emergency / Ambulance: 119 · Police: 110 · Fire & Rescue: 113 · Search & Rescue (BASARNAS): 115 · Disaster Emergency (BNPB): 117 · Tourist Police: 110',
  Cambodia:
    'Police: 117 · Fire: 118 · Ambulance: 119 · Tourist Police (English): 077 788 603 · Country Code: +855',
  Vietnam:
    'Police: 113 · Fire: 114 · Ambulance: 115 · Search & Rescue: 112 · Country Code: +84',
};

export function getCountryEmergencyNumbers(country: string): string | undefined {
  return countryEmergencyNumbers[country];
}
