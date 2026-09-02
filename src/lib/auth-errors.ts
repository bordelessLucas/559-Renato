import { FirebaseError } from 'firebase/app'

export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return 'Ocorreu um erro inesperado. Tente novamente.'
  }

  switch (error.code) {
    case 'auth/invalid-email':
      return 'Informe um e-mail válido.'
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Contate o administrador.'
    case 'auth/user-not-found':
      return 'Não encontramos uma conta com este e-mail.'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um momento e tente novamente.'
    case 'auth/network-request-failed':
      return 'Falha de conexão. Verifique sua internet.'
    case 'auth/missing-email':
      return 'Informe o e-mail para continuar.'
    case 'auth/invalid-action-code':
      return 'O link de recuperação é inválido ou expirou.'
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso.'
    case 'auth/weak-password':
      return 'A senha é muito fraca. Use ao menos 6 caracteres.'
    case 'auth/operation-not-allowed':
      return 'Login por e-mail/senha não está habilitado no Firebase.'
    default:
      return 'Não foi possível concluir a operação. Tente novamente.'
  }
}
