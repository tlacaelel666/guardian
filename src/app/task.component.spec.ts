import { TestBed } from '@angular/core/testing';

import { TaskService } from '../services/task.service'; // Adjusted import path
import { QuantumSessionComponent } from './task.component';

describe('QuantumSessionComponent', () => {
  let component: QuantumSessionComponent;
  let taskService: TaskService; 

  beforeEach(() => {
    TestBed.configureTestingModule({});
    taskService = TestBed.inject(TaskService);
    component = new QuantumSessionComponent();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});