import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { Product } from '../../../core/models/store.models';
import { MoneyPipe } from '../../pipes/money.pipe';
@Component({
  selector: 'app-product-card', standalone: true, imports: [ButtonModule, MoneyPipe],
  templateUrl: './product-card.component.html', styleUrl: './product-card.component.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly favorite = input(false);
  readonly add = output<Product>();
  readonly toggleFavorite = output<string>();
}
