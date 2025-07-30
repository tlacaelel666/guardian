import { Timestamp } from "@angular/fire/firestore";

// Tipos de datos cuánticos
type SecurityLevel = 'none' | 'low' | 'medium' | 'high' | 'quantum';
type AuthenticationType = 'PUF' | 'GMAK' | 'BiMoType' | 'QuoreMind';

// Modelo principal de sesión cuántica
export type QuantumSession = {
  id: string;
  sessionName: string;
  securityLevel?: SecurityLevel;
  authenticated: boolean;
  owner: string;
  createdTime: Timestamp;
  lambdaAlpha?: number;  // Parámetro λ^
  lambdaBeta?: number;   // Parámetro λ²
  asymmetryMeasurement?: number;
  gmakHash?: string;     // Hash de autenticación gravitacional
  QuantumSessionComponent: any
};


