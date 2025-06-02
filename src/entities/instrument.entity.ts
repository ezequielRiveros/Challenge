import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './order.entity';
import { MarketData } from './market-data.entity';

@Entity('instruments')
export class Instrument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column()
  ticker: string;

  @Column()
  name: string;

  @OneToMany(() => Order, order => order.instrument)
  orders: Order[];

  @OneToMany(() => MarketData, marketData => marketData.instrument)
  marketData: MarketData[];
} 