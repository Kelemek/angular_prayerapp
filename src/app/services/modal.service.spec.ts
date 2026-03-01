import { describe, it, expect, beforeEach } from 'vitest';
import { ModalService } from './modal.service';

describe('ModalService', () => {
  let service: ModalService;

  beforeEach(() => {
    service = new ModalService();
  });

  describe('Service Creation', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should have printInstructionsModalOpen$ observable', () => {
      expect(service.printInstructionsModalOpen$).toBeDefined();
      expect(typeof service.printInstructionsModalOpen$.subscribe).toBe('function');
    });

    it('should have openPrintInstructionsModal method', () => {
      expect(typeof service.openPrintInstructionsModal).toBe('function');
    });

    it('should have closePrintInstructionsModal method', () => {
      expect(typeof service.closePrintInstructionsModal).toBe('function');
    });
  });

  describe('Initial State', () => {
    it('should start with printInstructionsModalOpen$ as false', () => {
      let emittedValue: boolean | undefined;
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        emittedValue = isOpen;
      });
      expect(emittedValue).toBe(false);
    });

    it('should emit false on first subscription', () => {
      let emittedValue: boolean | undefined;
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        emittedValue = isOpen;
      });
      expect(emittedValue).toBe(false);
    });
  });

  describe('openPrintInstructionsModal', () => {
    it('should open modal by emitting true', () => {
      service.openPrintInstructionsModal();

      let emittedValue: boolean | undefined;
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        emittedValue = isOpen;
      });
      expect(emittedValue).toBe(true);
    });

    it('should emit true to subscribers', () => {
      let emittedValue: boolean | undefined;
      
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        emittedValue = isOpen;
      });

      service.openPrintInstructionsModal();
      expect(emittedValue).toBe(true);
    });

    it('should notify all subscribers when opening', () => {
      let subscriber1Value: boolean | undefined;
      let subscriber2Value: boolean | undefined;

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        subscriber1Value = isOpen;
      });

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        subscriber2Value = isOpen;
      });

      service.openPrintInstructionsModal();

      expect(subscriber1Value).toBe(true);
      expect(subscriber2Value).toBe(true);
    });

    it('should can be called multiple times', () => {
      let callCount = 0;
      
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        if (isOpen) {
          callCount++;
        }
      });

      service.openPrintInstructionsModal();
      service.openPrintInstructionsModal();
      service.openPrintInstructionsModal();

      expect(callCount).toBe(3);
    });
  });

  describe('closePrintInstructionsModal', () => {
    it('should close modal by emitting false', () => {
      service.openPrintInstructionsModal();
      service.closePrintInstructionsModal();

      let emittedValue: boolean | undefined;
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        emittedValue = isOpen;
      });

      expect(emittedValue).toBe(false);
    });

    it('should emit false to subscribers after opening', () => {
      let emittedValues: boolean[] = [];

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        emittedValues.push(isOpen);
      });

      service.openPrintInstructionsModal();
      service.closePrintInstructionsModal();

      expect(emittedValues).toContain(false);
      expect(emittedValues[emittedValues.length - 1]).toBe(false);
    });

    it('should notify all subscribers when closing', () => {
      service.openPrintInstructionsModal();

      let subscriber1Value: boolean | undefined;
      let subscriber2Value: boolean | undefined;

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        subscriber1Value = isOpen;
      });

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        subscriber2Value = isOpen;
      });

      service.closePrintInstructionsModal();

      expect(subscriber1Value).toBe(false);
      expect(subscriber2Value).toBe(false);
    });

    it('can be called when modal is already closed', () => {
      let emittedValue: boolean | undefined;

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        emittedValue = isOpen;
      });

      service.closePrintInstructionsModal();
      expect(emittedValue).toBe(false);
    });

    it('should can be called multiple times', () => {
      let closeCount = 0;
      
      service.openPrintInstructionsModal();
      
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        if (!isOpen) {
          closeCount++;
        }
      });

      service.closePrintInstructionsModal();
      service.closePrintInstructionsModal();
      service.closePrintInstructionsModal();

      expect(closeCount).toBe(3);
    });
  });

  describe('State Transitions', () => {
    it('should transition from open to closed', () => {
      let states: boolean[] = [];

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        states.push(isOpen);
      });

      service.openPrintInstructionsModal();
      service.closePrintInstructionsModal();

      expect(states).toEqual([false, true, false]);
    });

    it('should transition from closed to open to closed', () => {
      let states: boolean[] = [];

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        states.push(isOpen);
      });

      service.openPrintInstructionsModal();
      service.closePrintInstructionsModal();
      service.openPrintInstructionsModal();
      service.closePrintInstructionsModal();

      expect(states).toEqual([false, true, false, true, false]);
    });

    it('should handle rapid state changes', () => {
      let states: boolean[] = [];

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        states.push(isOpen);
      });

      service.openPrintInstructionsModal();
      service.openPrintInstructionsModal();
      service.closePrintInstructionsModal();
      service.closePrintInstructionsModal();
      service.openPrintInstructionsModal();

      expect(states[states.length - 1]).toBe(true);
      expect(states.length).toBeGreaterThan(1);
    });
  });

  describe('Observable Behavior', () => {
    it('should be a cold observable that emits initial state on subscription', () => {
      let subscription1Value: boolean | undefined;
      let subscription2Value: boolean | undefined;

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        subscription1Value = isOpen;
      });

      // Second subscription gets the initial state
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        subscription2Value = isOpen;
      });

      expect(subscription1Value).toBe(false);
      expect(subscription2Value).toBe(false);
    });

    it('should emit to new subscribers after state change', () => {
      let subscription1Values: boolean[] = [];
      let subscription2Values: boolean[] = [];

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        subscription1Values.push(isOpen);
      });

      service.openPrintInstructionsModal();

      // New subscription gets current state
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        subscription2Values.push(isOpen);
      });

      service.closePrintInstructionsModal();

      expect(subscription1Values).toEqual([false, true, false]);
      expect(subscription2Values).toEqual([true, false]);
    });

    it('should support multiple independent subscriptions', () => {
      let sub1Values: boolean[] = [];
      let sub2Values: boolean[] = [];
      let sub3Values: boolean[] = [];

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        sub1Values.push(isOpen);
      });

      service.openPrintInstructionsModal();

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        sub2Values.push(isOpen);
      });

      service.closePrintInstructionsModal();

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        sub3Values.push(isOpen);
      });

      expect(sub1Values.length).toBeGreaterThan(0);
      expect(sub2Values.length).toBeGreaterThan(0);
      expect(sub3Values.length).toBeGreaterThan(0);
    });
  });

  describe('Modal State Management', () => {
    it('should correctly track modal open state', () => {
      let currentState: boolean | undefined;

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        currentState = isOpen;
      });

      expect(currentState).toBe(false);

      service.openPrintInstructionsModal();
      expect(currentState).toBe(true);

      service.closePrintInstructionsModal();
      expect(currentState).toBe(false);
    });

    it('should maintain state consistency across multiple operations', () => {
      let states: boolean[] = [];

      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        states.push(isOpen);
      });

      // Simulate user interaction sequence
      service.openPrintInstructionsModal();
      service.closePrintInstructionsModal();
      service.openPrintInstructionsModal();
      service.closePrintInstructionsModal();

      // Should have recorded all state changes
      expect(states.length).toBeGreaterThanOrEqual(5);
    });

    it('should emit current state to late subscribers', () => {
      service.openPrintInstructionsModal();

      let lateSubscriberValue: boolean | undefined;

      // Subscribe after state change
      service.printInstructionsModalOpen$.subscribe((isOpen) => {
        lateSubscriberValue = isOpen;
      });

      expect(lateSubscriberValue).toBe(true);
    });
  });

  describe('Service Methods Return Type', () => {
    it('openPrintInstructionsModal should return void', () => {
      const result = service.openPrintInstructionsModal();
      expect(result).toBeUndefined();
    });

    it('closePrintInstructionsModal should return void', () => {
      const result = service.closePrintInstructionsModal();
      expect(result).toBeUndefined();
    });

    it('printInstructionsModalOpen$ should be an Observable', () => {
      const observable = service.printInstructionsModalOpen$;
      expect(typeof observable.subscribe).toBe('function');
      expect(typeof observable.pipe).toBe('function');
    });
  });
});
