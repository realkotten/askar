import { AssayCertificate } from '../types';
import { certificatesChunk1 } from './database1';
import { certificatesChunk2 } from './database2';
import { certificatesChunk3 } from './database3';
import { certificatesChunk4 } from './database4';

// Combine all chunks into one complete list (covering all 343+ assay codes from 706160 to 706502)
export const initialCertificatesList: AssayCertificate[] = [
  ...certificatesChunk1,
  ...certificatesChunk2,
  ...certificatesChunk3,
  ...certificatesChunk4
];

// Create a record index by certificate ID (in uppercase and trimmed)
export const initialCertificatesMap: Record<string, AssayCertificate> = {};

for (const cert of initialCertificatesList) {
  if (cert && cert.id) {
    const key = cert.id.trim().toUpperCase();
    initialCertificatesMap[key] = cert;
  }
}
