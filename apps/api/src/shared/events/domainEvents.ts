import { EventEmitter } from "node:events";
import type { AppointmentDTO, PaymentDTO } from "@slotix/types";

export interface DomainEvents {
  AppointmentCreated: AppointmentDTO;
  AppointmentCancelled: AppointmentDTO;
  PaymentCreated: PaymentDTO;
  PaymentPaid: PaymentDTO;
  PaymentFailed: PaymentDTO;
  PaymentRefunded: PaymentDTO;
}

class DomainEventBus extends EventEmitter {
  emitEvent<K extends keyof DomainEvents>(event: K, payload: DomainEvents[K]): void {
    this.emit(event, payload);
  }

  onEvent<K extends keyof DomainEvents>(event: K, listener: (payload: DomainEvents[K]) => void): void {
    this.on(event, listener);
  }
}

export const domainEvents = new DomainEventBus();
