import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { Order, OrderStatus, OrderSide } from '../entities/order.entity';
import { Instrument } from '../entities/instrument.entity';
import { MarketData } from '../entities/market-data.entity';
import { PortfolioDto, PositionDto } from '../dtos/portfolio.dto';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
    @InjectRepository(MarketData)
    private marketDataRepository: Repository<MarketData>,
  ) {}

  async getPortfolio(userId: number): Promise<PortfolioDto> {
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.instrument', 'instrument')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.FILLED })
      .getMany();

    if (!orders || orders.length === 0) {
      this.logger.warn(`No orders found for userId: ${userId}`);
      return {
        totalValue: 0,
        availableCash: 0,
        positions: [],
      };
    }

    const arsInstrument = await this.instrumentRepository.findOne({
      where: { type: 'MONEDA' },
    });

    if (!arsInstrument) {
      throw new NotFoundException('ARS instrument not found');
    }

    let availableCash = 0;
    orders.forEach(order => {
      if (order.instrumentId === arsInstrument.id) {
        if (order.side === OrderSide.CASH_IN) {
          availableCash += order.size;
        } else if (order.side === OrderSide.CASH_OUT) {
          availableCash -= order.size;
        }
      } else {
        if (order.side === OrderSide.BUY) {
          availableCash -= order.size * order.price;
        } else if (order.side === OrderSide.SELL) {
          availableCash += order.size * order.price;
        }
      }
    });

    const positionMap = new Map<number, PositionDto>();
    
    for (const order of orders) {
      if (order.instrumentId === arsInstrument.id) continue;

      const position = positionMap.get(order.instrumentId) || {
        instrumentId: order.instrumentId,
        ticker: order.instrument.ticker,
        name: order.instrument.name,
        quantity: 0,
        marketValue: 0,
        returnPercentage: 0,
        dailyReturn: 0,
        averagePrice: order.price
      };

      if (order.side === OrderSide.BUY) {
        const newQuantity = position.quantity + order.size;
        position.averagePrice = ((position.quantity * position.averagePrice) + (order.size * order.price)) / newQuantity;
        position.quantity = newQuantity;
      } else if (order.side === OrderSide.SELL) {
        position.quantity -= order.size;
      }

      positionMap.set(order.instrumentId, position);
    }

    const positions: PositionDto[] = Array.from(positionMap.values())
      .filter(position => position.quantity > 0);

    if (positions.length === 0) {
      return {
        totalValue: availableCash,
        availableCash,
        positions: [],
      };
    }
    
    const instrumentIds = positions.map(p => p.instrumentId);

    const marketDataEntries = await this.marketDataRepository
      .createQueryBuilder('marketData')
      .where('marketData.instrumentId IN (:...instrumentIds)', { instrumentIds })
      .orderBy('marketData.date', 'DESC')
      .getMany();

    if (!marketDataEntries || marketDataEntries.length === 0) {
      this.logger.warn(`No market data found for instruments: ${instrumentIds.join(', ')}`);
      return {
        totalValue: availableCash,
        availableCash,
        positions: [],
      };
    }

    const marketDataMap = new Map<number, MarketData>();
    for (const data of marketDataEntries) {
      if (!marketDataMap.has(data.instrumentId)) {
        marketDataMap.set(data.instrumentId, data);
      }
    }

    let totalValue = availableCash;
    const validPositions: PositionDto[] = [];

    positions.forEach(position => {
      const marketData = marketDataMap.get(position.instrumentId);
      
      if (marketData && marketData.close > 0 && marketData.previousClose > 0) {
        position.marketValue = position.quantity * marketData.close;
        position.dailyReturn = ((marketData.close - marketData.previousClose) / marketData.previousClose) * 100;
        position.returnPercentage = ((marketData.close - position.averagePrice) / position.averagePrice) * 100;
        totalValue += position.marketValue;
        validPositions.push(position);
      } else {
        this.logger.warn(`Invalid market data for instrument ${position.ticker} (ID: ${position.instrumentId})`);
      }
    });

    return {
      totalValue,
      availableCash,
      positions: validPositions,
    };
  }
} 