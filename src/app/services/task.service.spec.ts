import { TestBed } from '@angular/core/testing';

import { QuantumSecurityService } from './task.service';
import { QuantumSession } from './quantum.service';
import { QuantumSessionComponent } from '../task.component';
import { AuthCredential } from 'firebase/auth';
import { idToken } from '@angular/fire/auth';

describe('TaskService', () => {
  let service: QuantumSession;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(idToken,AuthCredential);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
describe('QuantumSessionComponent', () => {
  let component: QuantumSessionComponent;
  let quantumSecurityService: QuantumSecurityService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    quantumSecurityService = TestBed.inject(QuantumSecurityService);
    component = new QuantumSessionComponent();
  });
  it('should be created', () => {
    expect();
  });})