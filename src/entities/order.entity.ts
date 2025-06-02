import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Instrument } from './instrument.entity';

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT'
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT'
}

export enum OrderStatus {
  NEW = 'NEW',
  FILLED = 'FILLED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'instrumentid' })
  instrumentId: number;

  @ManyToOne(() => Instrument)
  @JoinColumn({ name: 'instrumentid' })
  instrument: Instrument;

  @Column({ name: 'userid' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userid' })
  user: User;

  @Column({
    type: 'enum',
    enum: OrderSide
  })
  side: OrderSide;

  @Column('decimal', { precision: 10, scale: 2 })
  size: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({
    type: 'enum',
    enum: OrderType
  })
  type: OrderType;

  @Column({
    type: 'enum',
    enum: OrderStatus
  })
  status: OrderStatus;

  @Column({ name: 'rejection_reason', nullable: true })
  rejection_reason: string;

  @CreateDateColumn()
  datetime: Date;
} 