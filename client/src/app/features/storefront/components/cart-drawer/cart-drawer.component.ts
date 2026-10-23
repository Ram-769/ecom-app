import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CartService } from '../../../../core/services/cart.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { OrderService } from '../../../../core/services/order.service';
import type { CreateOrderRequest, Order } from '../../../../core/models/store.models';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

@Component({
  selector: 'app-cart-drawer', standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DrawerModule, DialogModule, InputTextModule, TextareaModule, MoneyPipe],
  templateUrl: './cart-drawer.component.html', styleUrl: './cart-drawer.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartDrawerComponent {
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  readonly cart = inject(CartService);
  readonly catalog = inject(CatalogService);
  private readonly orders = inject(OrderService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly checkoutVisible = signal(false);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly confirmed = signal<Order | null>(null);
  private pendingAttempt: { signature: string; key: string } | null = null;
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    address: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(400)]],
  });

  openCheckout(): void {
    this.error.set(''); this.confirmed.set(null); this.checkoutVisible.set(true); this.visibleChange.emit(false);
  }
  setCheckoutVisible(visible: boolean): void { if (!this.submitting()) this.checkoutVisible.set(visible); }
  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting() || !this.cart.count() || this.cart.invalidStock()) return;
    const customer = this.form.getRawValue();
    const request: CreateOrderRequest = {
      customer: { name: customer.name.trim(), email: customer.email.trim(), address: customer.address.trim() },
      items: this.cart.items().map(item => ({ productId: item.product.id, quantity: item.quantity })),
    };
    const signature = JSON.stringify(request);
    if (this.pendingAttempt?.signature !== signature) this.pendingAttempt = { signature, key: crypto.randomUUID() };
    this.error.set(''); this.submitting.set(true);
    this.orders.place(request, this.pendingAttempt.key).pipe(
      finalize(() => this.submitting.set(false)), takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: response => { this.confirmed.set(response.order); this.cart.clear(); this.catalog.load(); this.pendingAttempt = null; this.form.reset(); },
      error: (error: unknown) => {
        let message = 'Could not reach the store. Your bag is saved. Please try again.';
        if (error instanceof HttpErrorResponse) {
          const body: unknown = error.error;
          if (typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') message = body.message;
          if (error.status === 409 || error.status === 404) this.catalog.load();
        }
        this.error.set(message);
      },
    });
  }
}
