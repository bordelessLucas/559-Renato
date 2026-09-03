export function schoolDisplayName(school: { name: string; tradeName?: string }) {
  return school.tradeName || school.name
}

export function buildSchoolSignupPath(schoolId: string, schoolName: string) {
  const params = new URLSearchParams({
    escola: schoolName,
    preview: '1',
  })
  return `/cadastro/${schoolId}?${params.toString()}`
}

export function buildSchoolSignupUrl(schoolId: string, schoolName: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}${buildSchoolSignupPath(schoolId, schoolName)}`
}

export function buildQrImageUrl(data: string, size = 280) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(data)}`
}

export function buildWhatsAppShareUrl(schoolName: string, signupUrl: string) {
  const text = `Cadastre seu filho na ${schoolName} pelo link: ${signupUrl}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
