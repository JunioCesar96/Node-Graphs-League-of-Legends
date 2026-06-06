import { normalizeCodeDockFileName, needsBinConversionOnOpen, needsBinConversionOnSave } from '@/core/codeDockFileTypes'

import { downloadBytesAsFile } from '@/core/jadeBridgeApi'



import { decodeBinArtifact } from './decodeBinArtifact'

import { encodeBinArtifact, ritualBinBase64ToBytes } from './encodeBinArtifact'

import { isNativeRitualBinDevMode } from './localInvokeGateway'



export type RitualBinOpenOutcome =

  | { branch: 'success'; text: string; via: string }

  | { branch: 'cancelled' }

  | { branch: 'error'; message: string }



export type RitualBinSaveOutcome =

  | { branch: 'success'; fileName: string; bytes: Uint8Array }

  | { branch: 'cancelled' }

  | { branch: 'error'; message: string }



function formatNativeOpenError(

  branch: 'not_configured' | 'network_error' | 'codec_error',

  message: string,

): string {

  if (branch === 'not_configured') {

    return (

      'Motor Nativo não disponível.\n\n' +

      '1. Arranca `npm run dev` e escolhe modo Nativo (Enter).\n' +

      '2. Compila a ponte: `npm run native:http-bridge:build`\n' +

      '3. Confirma que responde em 127.0.0.1:8791 (GET /capabilities).'

    )

  }



  if (branch === 'network_error') {

    return `Não foi possível contactar o motor nativo (${message}).\n\nConfirma npm run dev (modo Nativo) e npm run native:http-bridge:build.`

  }



  return message

}



function formatNativeSaveError(

  branch: 'not_configured' | 'network_error' | 'codec_error',

  message: string,

): string {

  if (branch === 'not_configured') {

    return (

      'Gravar .bin no modo Nativo exige o motor Rust activo.\n' +

      'Compila: `npm run native:http-bridge:build` e reinicia o dev.'

    )

  }



  if (branch === 'network_error') {

    return `Falha de rede ao gravar: ${message}`

  }



  return message

}



/** Abre `.bin` usando o motor nativo integrado (POST /convert). */

export async function openBinViaNativeCodec(file: File): Promise<RitualBinOpenOutcome> {

  const decoded = await decodeBinArtifact(file)



  if (decoded.branch === 'success') {

    return {

      branch: 'success',

      text: decoded.text,

      via: 'motor nativo /convert (Rust)',

    }

  }



  if (decoded.branch === 'not_configured' || decoded.branch === 'network_error' || decoded.branch === 'codec_error') {

    const branch = decoded.branch

    const message =

      branch === 'codec_error' ? decoded.message : branch === 'network_error' ? decoded.message : ''

    return {

      branch: 'error',

      message: formatNativeOpenError(branch, message),

    }

  }



  return { branch: 'error', message: 'Não foi possível descodificar o ficheiro .bin.' }

}



/** Grava texto ritual → `.bin` via motor nativo. */

export async function saveBinViaNativeCodec(

  content: string,

  suggestedName: string,

): Promise<RitualBinSaveOutcome> {

  if (!needsBinConversionOnSave(suggestedName)) {

    return { branch: 'error', message: 'Extensão inválida para gravação binária.' }

  }



  const encoded = await encodeBinArtifact(content)



  if (encoded.branch === 'success') {

    const normalized = normalizeCodeDockFileName(suggestedName)

    const fileName = normalized.toLowerCase().endsWith('.bin')

      ? normalized

      : `${normalized.replace(/\.py$/i, '')}.bin`



    return {

      branch: 'success',

      fileName,

      bytes: ritualBinBase64ToBytes(encoded.bytesBase64),

    }

  }



  if (encoded.branch === 'not_configured' || encoded.branch === 'network_error' || encoded.branch === 'codec_error') {

    const branch = encoded.branch

    const message =

      branch === 'codec_error' ? encoded.message : branch === 'network_error' ? encoded.message : ''

    return {

      branch: 'error',

      message: formatNativeSaveError(branch, message),

    }

  }



  return { branch: 'error', message: 'Falha ao codificar ritual para .bin.' }

}



export function shouldUseNativeRitualBinCodec(): boolean {

  return isNativeRitualBinDevMode()

}



export function needsBinOpenConversion(fileName: string): boolean {

  return needsBinConversionOnOpen(fileName)

}



export { downloadBytesAsFile }

