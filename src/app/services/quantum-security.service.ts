/**
 * Copyright 2025 Docsafer Quantum Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NgZone, inject, Injectable } from '@angular/core';
import {
  Auth,
  authState,
  signInAnonymously,
  signOut,
  User,
} from '@angular/fire/auth';
import { getApp } from '@angular/fire/app';
import { MatSnackBar } from '@angular/material/snack-bar';
import { retryBackoff } from 'backoff-rxjs';
import { switchMap, tap, take, catchError } from 'rxjs/operators';
import { Observable, of, defer, Subject, BehaviorSubject } from 'rxjs';
import {
  doc,
  Firestore,
  setDoc,
  collection,
  deleteDoc,
  collectionData,
  collectionCount,
  getCountFromServer,
  query,
  orderBy,
  Timestamp,
  where,
  CollectionReference,
} from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { AI, getGenerativeModel, getAI, Schema, AIError, GoogleAIBackend } from '@angular/fire/ai';
import { environment } from '../../environments/environments';

type SecurityLevel = 'none' | 'low' | 'medium' | 'high' | 'quantum';
type AuthenticationType = 'PUF' | 'GMAK' | 'BiMoType' | 'QuoreMind';

export type QuantumSession = {
  forEach(arg0: (operation: import("./quantum.service").QuantumSession) => void): unknown;
  length: any;
  id: string;
  sessionName: string;
  securityLevel?: SecurityLevel; // Optional: only for main sessions
  authenticated: boolean;
  owner: string;
  createdTime: Timestamp;
  order?: number;
  parentId?: string; // Optional: only for sub-operations
  authenticationType?: AuthenticationType;
  lambdaAlpha?: number; // λ^ parameter
  lambdaBeta?: number; // λ² parameter
  asymmetryMeasurement?: number;
  gmakHash?: string;
};

export type QuantumSessionWithOperations = {
  session: QuantumSession;
  [x: string]: QuantumSession;
  mainSession: QuantumSession;
  operations: QuantumSession;
};

type GeneratedSecurityProtocol = {
  sessionName: string;
  operations: string[];
  recommendedLevel: SecurityLevel;
  requiredAuthentication: AuthenticationType[];
}

const quantumSecuritySchema = Schema.object({
  properties: {
    sessionName: Schema.string(),
    operations: Schema.array({
      items: Schema.string(),
    }),
    recommendedLevel: Schema.string(),
    requiredAuthentication: Schema.array({
      items: Schema.string(),
    }),
  }
});

const QUANTUM_MODEL_CONFIG = {
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: quantumSecuritySchema,
  },
  systemInstruction: `You are CERBERUS QAISOS, an AI expert in quantum security systems. 
  Generate quantum security protocols with operations that follow the PGP (Quadrant Gravitational Polarity) theory.
  Keep session names concise, ideally within 10 words. Operations should follow quantum security logic.
  Security levels: quantum > high > medium > low > none.
  Authentication types: QuoreMind (hardware verification), PUF (boot security), GMAK (session auth), BiMoType (quantum interpretation).`,
};

@Injectable({
  providedIn: 'root',
})
export class QuantumSecurityService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private ai = inject(AI);
  // Initialize the Gemini Developer API backend service for quantum security
  private firebaseAI = getAI(getApp(), { backend: new GoogleAIBackend() });
  // Caveat: the Gemini Developer API backend service may take a while (~10s) to initialize after your
  // first call to GenerateContent(). You may see a PERMISSION_DENIED error before then.
  // Create a `GenerativeModel` instance optimized for quantum security protocols
  private prodQuantumModel = getGenerativeModel(this.firebaseAI, QUANTUM_MODEL_CONFIG);

  private experimentQuantumModel = getGenerativeModel(this.ai, QUANTUM_MODEL_CONFIG);
  private quantumSystemReadySubject = new BehaviorSubject(false);
  
  get quantumSystemReady(): Observable<boolean> {
    return this.quantumSystemReadySubject.asObservable();
  }

  user$ = authState(this.auth);
  public quantumSessionsSubject = new Subject<QuantumSession[]>();
  quantumSessions$ = this.quantumSessionsSubject.asObservable(); // Observable for components to subscribe to
  currentUser: User | null = null;
  public localQuantumUid: string | null = null;

  // Quantum security parameters
  private hardwareLambdaAlpha: number = 0.162494; // Expected λ^ value
  private hardwareLambdaBeta: number = 0.298753; // Expected λ² value

  constructor(private snackBar: MatSnackBar, private zone: NgZone) {
    this.user$.subscribe((user: User | null) => {
      this.currentUser = user;
      if (user) {
        // User is authenticated through quantum verification
        this.localQuantumUid = user.uid;
      } else {
        // User is not authenticated, generate quantum UID
        if (!this.localQuantumUid) {
          this.localQuantumUid = this.generateQuantumLocalUid();
        }
      }
      this.loadQuantumSessions().subscribe((sessions) => {
        this.quantumSessionsSubject.next(sessions);
      });
    });

    this.initializeQuantumLogin();
  }

  initializeQuantumLogin(): void {
    // Perform PUF verification before allowing anonymous login
    const pufVerification = this.performPUFVerification();
    if (pufVerification.isValid) {
      signInAnonymously(this.auth).catch((error) => {
        console.error('Quantum anonymous login failed:', error);
        // Continue without authentication, relying on the local quantum UID
      });
    } else {
      this.handleQuantumSecurityError('PUF Verification failed. Hardware may be compromised.');
    }
  }

  performPUFVerification(): { isValid: boolean; measuredAsymmetry: number } {
    // Simulate QuoreMind calibration circuit
    const measuredAsymmetry = this.simulateQuantumAsymmetryMeasurement();
    const tolerance = 0.001; // Quantum measurement tolerance
    
    const isValid = Math.abs(measuredAsymmetry - this.hardwareLambdaAlpha) < tolerance;
    
    console.log(`[Quantum Board] Executing auto-test of hardware (QuoreMind routine)...`);
    console.log(`[Quantum Board] Physical asymmetry measured: ${measuredAsymmetry}`);
    
    if (isValid) {
      console.log(`[OS Core] VERIFICATION SUCCESSFUL. Quantum hardware is genuine.`);
    } else {
      console.log(`[OS Core] SECURITY ALERT! Hardware fingerprint mismatch.`);
      console.log(`Expected: ${this.hardwareLambdaAlpha}, Measured: ${measuredAsymmetry}`);
    }
    
    return { isValid, measuredAsymmetry };
  }

  private simulateQuantumAsymmetryMeasurement(): number {
    // Simulate quantum measurement with some natural variation
    const baseAsymmetry = this.hardwareLambdaAlpha;
    const quantumNoise = (Math.random() - 0.5) * 0.0005; // Small quantum fluctuation
    return baseAsymmetry + quantumNoise;
  }

  generateGMAK(challenge: { n: number; e_min: number }): string {
    // Simulate GMAK generation using quantum gravity simulation
    const { n, e_min } = challenge;
    const quantumSeed = this.hardwareLambdaAlpha * this.hardwareLambdaBeta;
    const gmakValue = Math.sin(n * quantumSeed) * Math.cos(e_min * quantumSeed);
    return btoa(gmakValue.toString()).substring(0, 16); // Base64 encoded hash
  }

  logout(): void {
    signOut(this.auth)
      .then(() => {
        console.log('Quantum session terminated');
        this.quantumSessionsSubject.next([]);
      })
      .catch((error) => console.error('Quantum sign out error:', error));
  }

  handleQuantumSecurityError(error: any, userMessage?: string, duration: number = 5000): void {
    const projectId = environment.firebase?.projectId || '';
    if (error instanceof AIError) {
      userMessage = `Quantum AI Error: ${error.message}`;
      duration = 10000;
    }
    if (typeof error === 'string' && error.includes('PUF Verification')) {
      userMessage = `QUANTUM SECURITY BREACH: ${error}`;
      duration = 15000;
    }
    if (error.message && error.message.indexOf('Missing or insufficient permissions') >= 0) {
      userMessage = 
        `Error communicating with Quantum Firestore. Please check status at https://console.firebase.google.com/project/${projectId}/firestore`;
      duration = 10000;
    }

    console.error('Quantum Security Error:', error);
    this.zone.run(() => {
      this.snackBar.open(userMessage || error.message || error, 'Secure Close', {
        duration,
        verticalPosition: 'top',
        horizontalPosition: 'center',
        panelClass: ['quantum-security-error']
      });
    });
  }

  private generateQuantumLocalUid(): string {
    const quantumEntropy = Math.random() * this.hardwareLambdaAlpha * this.hardwareLambdaBeta;
    return 'quantum-' + uuidv4() + '-' + btoa(quantumEntropy.toString()).substring(0, 8);
  }

  loadQuantumSessions(): Observable<QuantumSession[]> {
    const sessionQuery = query(
      collection(this.firestore, 'quantum_sessions'),
      where('securityLevel', '!=', 'none'),
      orderBy('createdTime', 'desc')
    );
    return defer(() => this.loadQuantumSessionCount()).pipe(
      retryBackoff({
        initialInterval: 1000,
        maxInterval: 3000,
        maxRetries: 15,
      }),
      switchMap((sessionCount) => {
        this.quantumSystemReadySubject.next(true);
        if (sessionCount.data().count === 0) {
          return of([] as QuantumSession[]);
        }
        return collectionData(sessionQuery, { idField: 'id' }) as Observable<QuantumSession[]>;
      }),
      catchError((error: Error) => {
        this.handleQuantumSecurityError(error);
        return of([]);
      })
    );
  }

  loadQuantumSessionCount() {
    const sessionQuery = query(
      collection(this.firestore, 'quantum_sessions'),
      where('securityLevel', '!=', 'none')
    );
    return getCountFromServer(sessionQuery);
  }

  loadQuantumOperations(mainSessionId: string): Observable<QuantumSession[]> {
    const operationQuery = query(
      collection(this.firestore, 'quantum_sessions') as CollectionReference<QuantumSession, QuantumSession>,
      where('parentId', '==', mainSessionId),
      orderBy('order', 'asc')
    );
    return collectionData(operationQuery, { idField: 'id' });
  }

  createQuantumSessionRef(id?: string) {
    const sessionCollection = collection(this.firestore, 'quantum_sessions');
    return id ? doc(sessionCollection, id) : doc(sessionCollection); // Firestore generates ID if not provided
  }

  async quantumFileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(JSON.stringify(reader?.result).split(',')[1]);
      reader.readAsDataURL(file);
    });
    const result = await base64EncodedDataPromise;
    const processedData = JSON.stringify(result).slice(1, -3);
    return {
      inlineData: { data: processedData, mimeType: file.type },
    } as any;
  }

  async updateQuantumSession(session: QuantumSession): Promise<void> {
    try {
      // Verify quantum integrity before update
      const pufCheck = this.performPUFVerification();
      if (!pufCheck.isValid) {
        throw new Error('Quantum integrity check failed during session update');
      }

      const sessionRef = doc(this.firestore, 'quantum_sessions', session.id);
      await setDoc(sessionRef, {
        ...session,
        asymmetryMeasurement: pufCheck.measuredAsymmetry,
      }, { merge: true });
    } catch (error) {
      this.handleQuantumSecurityError(error, 'Error updating quantum session');
      throw error;
    }
  }

  async generateQuantumSecurityProtocol(input: {
    file?: File;
    prompt: string;
  }): Promise<GeneratedSecurityProtocol> {
    const { file, prompt } = input;

    if (!file && !prompt) {
      return {
        sessionName: "Please provide security requirements",
        operations: [],
        recommendedLevel: "none",
        requiredAuthentication: [],
      };
    }

    const quantumImagePart = file ? await this.quantumFileToGenerativePart(file) : '';
    const enhancedPrompt = `Generate quantum security protocol for: ${prompt}. 
    Consider architecture with PUF, GMAK, BiMoType v2.0, and QuoreMind systems.`;

    try {
      const result = await this.experimentQuantumModel.generateContent(
        [enhancedPrompt, quantumImagePart].filter(Boolean)
      );
      const response = await result.response.text();
      return JSON.parse(response);
    } catch (error) {
      this.handleQuantumSecurityError(error, 'Failed to generate quantum security protocol');
      throw error;
    }
  }

  async addQuantumSessionWithOperations(
    mainSession: Omit<QuantumSession, 'id'>,
    operations: Omit<QuantumSession, 'id'>[]
  ): Promise<void> {
    const userId = this.currentUser?.uid || this.localQuantumUid || this.generateQuantumLocalUid();

    try {
      // Generate GMAK for session authentication
      const gmakChallenge = { n: Date.now() % 1000, e_min: Math.random() };
      const gmakHash = this.generateGMAK(gmakChallenge);
      
      const sessionRef = doc(collection(this.firestore, 'quantum_sessions'));
      const newSession: QuantumSession = {
        ...mainSession,
        id: sessionRef.id,
        owner: userId,
        createdTime: Timestamp.fromDate(new Date()),
        lambdaAlpha: this.hardwareLambdaAlpha,
        lambdaBeta: this.hardwareLambdaBeta,
        gmakHash: gmakHash,
      };
      await setDoc(sessionRef, newSession);

      for (let [index, operation] of operations.entries()) {
        const operationRef = doc(collection(this.firestore, 'quantum_sessions'));
        const newOperation: QuantumSession = {
          ...operation,
          id: operationRef.id,
          owner: userId,
          createdTime: Timestamp.fromDate(new Date()),
          parentId: sessionRef.id,
          order: index,
          gmakHash: this.generateGMAK({ n: index, e_min: Math.random() }),
        };
        await setDoc(operationRef, newOperation);
      }
    } catch (error) {
      this.handleQuantumSecurityError(
        error,
        'Error adding quantum session and operations to secure storage'
      );
    }
  }

  async deleteQuantumSessionAndOperations(sessionId: string): Promise<void> {
    try {
      // Verify quantum authorization before deletion
      const pufCheck = this.performPUFVerification();
      if (!pufCheck.isValid) {
        throw new Error('Quantum authorization failed. Cannot delete session.');
      }

      const operationsObservable = this.loadQuantumOperations(sessionId);

      operationsObservable
        .pipe(
          catchError((error: Error) => {
            this.handleQuantumSecurityError(error);
            return of([]);
          })
        )
        .subscribe(async (operations) => {
          for (let operation of operations) {
            const operationRef = doc(this.firestore, 'quantum_sessions', operation.id);
            await deleteDoc(operationRef);
          }

          const sessionRef = doc(this.firestore, 'quantum_sessions', sessionId);
          await deleteDoc(sessionRef);
          
          console.log(`[Quantum Security] Session ${sessionId} and related operations securely deleted`);
        });
    } catch (error) {
      this.handleQuantumSecurityError(error, 'Failed to securely delete quantum session');
    }
  }

  // Additional quantum-specific methods
  async verifyQuantumIntegrity(): Promise<boolean> {
    const pufResult = this.performPUFVerification();
    return pufResult.isValid;
  }

  async generateQuantumReport(): Promise<string> {
    const sessions = await this.loadQuantumSessions().pipe(take(1)).toPromise();
    const activeSessionsCount = sessions?.filter(s => s.authenticated).length || 0;
    const totalSessions = sessions?.length || 0;
    const pufResult = this.performPUFVerification();

    return `
--- DOCSAFER QUANTUM SECURITY REPORT ---
Active Quantum Sessions: ${activeSessionsCount}
Total Sessions: ${totalSessions}
Hardware λ^ Parameter: ${this.hardwareLambdaAlpha}
Hardware λ² Parameter: ${this.hardwareLambdaBeta}
System Status: ${pufResult.isValid ? 'SECURE' : 'COMPROMISED'}
Generated: ${new Date().toISOString()}
--- END REPORT ---
    `;
  }
}