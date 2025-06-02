import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Instrument } from './instrument.entity';

@Entity('marketdata')
export class MarketData {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Instrument)
  @JoinColumn({ name: 'instrumentid' })
  instrument: Instrument;

  @Column({ name: 'instrumentid' })
  instrumentId: number;

  @Column('decimal', { precision: 10, scale: 2 })
  open: number;

  @Column('decimal', { precision: 10, scale: 2 })
  close: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'previousclose' })
  previousClose: number;

  @Column('decimal', { precision: 10, scale: 2 })
  high: number;

  @Column('decimal', { precision: 10, scale: 2 })
  low: number;

  @Column({ name: 'date' })
  datetime: Date;

} 