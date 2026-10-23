import { Pipe, type PipeTransform } from '@angular/core';
import { STORE_CONFIG } from '@ecom/contracts';
@Pipe({ name: 'money', standalone: true, pure: true })
export class MoneyPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat(STORE_CONFIG.locale, { style: 'currency', currency: STORE_CONFIG.currency, maximumFractionDigits: 0 });
  transform(paise: number): string { return this.formatter.format(paise / 100); }
}
