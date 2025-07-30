
import {
  input,
  output,
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { QuantumSession } from './services/quantum.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuantumSessionWithOperations } from './services/task.service';

@Component({
  selector: 'app-quantum-session',
  standalone: true,
  imports: [
    MatButtonToggleModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuantumSessionComponent {
  quantumSession = input(undefined as QuantumSessionWithOperations | undefined);
  canTerminate = input(true);
  sowGeneratedWithCerberus = input(false);
  showQuantumMetrics = input(true);

  onTerminate = output<QuantumSessionWithOperations>();
  onOperationsAuthToggle = output<QuantumSession[]>();
  onSecurityLevelChange = output<QuantumSession>();
  onQuantumVerification = output<QuantumSession>();

  /**
   * Toggles the authentication status of a quantum operation
   * This simulates the GMAK authentication process
   */
  onAuthStatusChanged(operation: QuantumSession) {
    operation.authenticated = !operation.authenticated;
    
    // Simulate GMAK verification process
    if (operation.authenticated) {
      console.log(`[GMAK] Authenticating operation: ${operation.sessionName}`);
      console.log(`[GMAK] Generated hash: ${operation.gmakHash}`);
    } else {
      console.log(`[GMAK] Deauthenticating operation: ${operation.sessionName}`);
    }
    
    this.onOperationsAuthToggle.emit([operation]);
  }

  /**
   * Toggles authentication for the main session and all its operations
   * This simulates a full quantum session verification using PUF + GMAK
   */
  onAuthChangeMainSession(session?: QuantumSessionWithOperations) {
    if (session) {
      const newAuthState = !session.mainSession.authenticated;
      
      // Update all operations to match main session auth state
      // Update all operations to match main session auth state
      session['operations'].forEach((operation: QuantumSession) => {
        operation.authenticated = newAuthState;
      });
      session.mainSession.authenticated = newAuthState;
      
      if (newAuthState) {
        console.log(`--- QUANTUM SESSION AUTHENTICATION SEQUENCE ---`);
        console.log(`[PUF] Hardware verification: ${session.mainSession.lambdaAlpha}`);
        console.log(`[GMAK] Session authenticated: ${session.mainSession.sessionName}`);
        console.log(`[QuoreMind] Operations count: ${session['operations'].length}`);
        console.log(`--- SESSION FULLY AUTHENTICATED ---`);
      } else {
        console.log(`[Quantum Security] Session deauthenticated: ${session.mainSession.sessionName}`);
      }
      
      }
  }

  /**
   * Handles quantum session termination with security protocols
   */
  onTerminateClicked() {
    const session = this.quantumSession();
    if (session) {
      console.log(`[Quantum Security] Initiating secure termination of session: ${session.mainSession.sessionName}`);
      console.log(`[PUF] Verifying hardware integrity before termination...`);
      this.onTerminate.emit(session);
    }
  }

  /**
   * Triggers quantum verification for a specific session
   */
  onVerifyQuantumIntegrity(session: QuantumSession) {
    console.log(`[QuoreMind] Running quantum integrity check on: ${session.sessionName}`);
    console.log(`[PUF] Lambda parameters - α: ${session.lambdaAlpha}, β: ${session.lambdaBeta}`);
    console.log(`[GMAK] Hash verification: ${session.gmakHash}`);
    this.onQuantumVerification.emit(session);
  }

  /**
   * Changes the security level of a quantum session
   */
  onSecurityLevelChanged(session: QuantumSession, newLevel: string) {
    const oldLevel = session.securityLevel;
    session.securityLevel = newLevel as any;
    
    console.log(`[Quantum Security] Security level changed from ${oldLevel} to ${newLevel}`);
    console.log(`[BiMoType] Recalibrating quantum parameters for session: ${session.sessionName}`);
    
    this.onSecurityLevelChange.emit(session);
  }

  /**
   * Gets the appropriate icon for the security level
   */
  getSecurityLevelIcon(level?: string): string {
    switch (level) {
      case 'quantum': return 'security';
      case 'high': return 'shield';
      case 'medium': return 'verified_user';
      case 'low': return 'lock';
      default: return 'lock_open';
    }
  }

  /**
   * Gets the appropriate color for the security level
   */
  getSecurityLevelColor(level?: string): string {
    switch (level) {
      case 'quantum': return 'accent';
      case 'high': return 'primary'; 
      case 'medium': return 'primary';
      case 'low': return 'warn';
      default: return '';
    }
  }

  /**
   * Gets the appropriate icon for authentication type
   */
  getAuthTypeIcon(authType?: string): string {
    switch (authType) {
      case 'PUF': return 'memory';
      case 'GMAK': return 'vpn_key';
      case 'BiMoType': return 'psychology';
      case 'QuoreMind': return 'precision_manufacturing';
      default: return 'key';
    }
  }

  /**
   * Formats the asymmetry measurement for display
   */
  formatAsymmetryMeasurement(measurement?: number): string {
    return measurement ? measurement.toFixed(6) : 'N/A';
  }

  /**
   * Gets the status text for quantum session
   */
  getQuantumStatusText(session?: QuantumSession): string {
    if (!session) return 'Unknown';
    
    if (session.authenticated) {
      return `Authenticated (${session.authenticationType || 'Unknown'})`;
    } else {
      return 'Pending Authentication';
    }
  }

  /**
   * Checks if the session has quantum-level security
   */
  isQuantumSecure(session?: QuantumSession): boolean {
    return session?.securityLevel === 'quantum' && session?.authenticated === true;
  }

  /**
   * Gets the appropriate tooltip for the security status
   */
  getSecurityTooltip(session?: QuantumSession): string {
    if (!session) return 'No session data';
    
    const level = session.securityLevel || 'none';
    const auth = session.authenticated ? 'Authenticated' : 'Not Authenticated';
    const type = session.authenticationType || 'Unknown';
    
    return `Security Level: ${level.toUpperCase()}\nStatus: ${auth}\nAuth Type: ${type}`;
  }

  /**
   * Determines if quantum metrics should be shown
   */
  shouldShowQuantumMetrics(): boolean {
    const session = this.quantumSession();
    return this.showQuantumMetrics() && 
           session?.mainSession?.securityLevel === 'quantum' &&
           (session?.mainSession?.lambdaAlpha !== undefined || 
            session?.mainSession?.asymmetryMeasurement !== undefined);
  }
}
