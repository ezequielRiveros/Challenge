import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, OrderType, OrderSide } from '../entities/order.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { Instrument } from '../entities/instrument.entity';
import { MarketData } from '../entities/market-data.entity';
import { PortfolioService } from './portfolio.service';
import { Position } from '../interfaces/position.interface';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
    @InjectRepository(MarketData)
    private marketDataRepository: Repository<MarketData>,
    private portfolioService: PortfolioService,
  ) {}

  private createRejectedOrder(
    createOrderDto: CreateOrderDto,
    size: number,
    price: number,
    reason: string
  ): Order {
    return this.orderRepository.create({
      instrumentId: createOrderDto.instrumentId,
      userId: createOrderDto.userId,
      side: createOrderDto.side,
      type: createOrderDto.type,
      size: size,
      price: price,
      status: OrderStatus.REJECTED,
      rejection_reason: reason,
    });
  }

  private async getLatestPrice(instrumentId: number): Promise<number> {
    const latestMarketData = await this.marketDataRepository
      .createQueryBuilder('marketData')
      .select('marketData.close')
      .where('marketData.instrumentId = :instrumentId', { instrumentId })
      .orderBy('marketData.date', 'DESC')
      .limit(1)
      .getOne();

    if (!latestMarketData) {
      throw new BadRequestException('No hay datos de mercado disponibles para el instrumento');
    }

    return latestMarketData.close;
  }

  private async validateOrderParameters(createOrderDto: CreateOrderDto) {
    if (!createOrderDto.userId) {
      throw new BadRequestException('El userId es requerido');
    }

    if (!createOrderDto.instrumentId) {
      throw new BadRequestException('El instrumentId es requerido');
    }

    const instrument = await this.instrumentRepository.findOne({
      where: { id: createOrderDto.instrumentId },
    });

    if (!instrument) {
      throw new BadRequestException('Instrumento no encontrado');
    }

    if (!createOrderDto.type) {
      throw new BadRequestException('El tipo de orden es requerido');
    }

    if (!Object.values(OrderType).includes(createOrderDto.type)) {
      throw new BadRequestException('Tipo de orden inválido');
    }

    if (createOrderDto.type === OrderType.LIMIT) {
      if (!createOrderDto.price) {
        throw new BadRequestException('Las órdenes LIMIT requieren un precio');
      }
      if (createOrderDto.price <= 0) {
        throw new BadRequestException('El precio debe ser mayor a 0');
      }
    }

    if (createOrderDto.size && createOrderDto.totalAmount) {
      throw new BadRequestException('No puede especificar tanto la cantidad como el monto total. Elija uno.');
    }

    if (!createOrderDto.size && !createOrderDto.totalAmount) {
      throw new BadRequestException('Debe especificar size o totalAmount');
    }

    if (createOrderDto.size !== undefined) {
      if (!Number.isInteger(createOrderDto.size)) {
        throw new BadRequestException('La cantidad debe ser un número entero');
      }
      if (createOrderDto.size <= 0) {
        throw new BadRequestException('La cantidad debe ser mayor a 0');
      }
    }

    if (createOrderDto.totalAmount !== undefined) {
      if (createOrderDto.totalAmount <= 0) {
        throw new BadRequestException('El monto total debe ser mayor a 0');
      }

      const latestPrice = await this.getLatestPrice(createOrderDto.instrumentId);
      const calculatedSize = Math.floor(createOrderDto.totalAmount / latestPrice);
      
      if (calculatedSize < 1) {
        throw new BadRequestException(
          `El monto total de ${createOrderDto.totalAmount} es insuficiente para comprar al menos una unidad al precio actual de ${latestPrice}`
        );
      }
    }
  }

  private async calculateOrderSize(createOrderDto: CreateOrderDto, latestPrice: number): Promise<number> {
    if (createOrderDto.size) {
      return createOrderDto.size;
    }

    return Math.floor(createOrderDto.totalAmount / latestPrice);
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    await this.validateOrderParameters(createOrderDto);

    const latestPrice = await this.getLatestPrice(createOrderDto.instrumentId);
    const orderPrice = createOrderDto.type === OrderType.MARKET ? latestPrice : createOrderDto.price;
    const orderSize = await this.calculateOrderSize(createOrderDto, latestPrice);
    const orderValue = orderSize * orderPrice;

    const portfolio = await this.portfolioService.getPortfolio(createOrderDto.userId);

    if (createOrderDto.side === OrderSide.BUY) {
      if (portfolio.availableCash < orderValue) {
        return this.createRejectedOrder(
          createOrderDto,
          orderSize,
          orderPrice,
          'Fondos insuficientes para ejecutar la orden'
        );
      }
    } else if (createOrderDto.side === OrderSide.SELL) {
      const position = portfolio.positions.find(p => p.instrumentId === createOrderDto.instrumentId);
      if (!position || position.quantity < orderSize) {
        return this.createRejectedOrder(
          createOrderDto,
          orderSize,
          orderPrice,
          'Tenencia insuficiente para ejecutar la orden'
        );
      }
    }

    const order = this.orderRepository.create({
      instrumentId: createOrderDto.instrumentId,
      userId: createOrderDto.userId,
      side: createOrderDto.side,
      type: createOrderDto.type,
      size: orderSize,
      price: orderPrice,
      status: createOrderDto.type === OrderType.MARKET ? OrderStatus.FILLED : OrderStatus.NEW,
      rejection_reason: null,
    });

    return this.orderRepository.save(order);
  }

  async cancel(orderId: number, userId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
    });

    if (!order) {
      throw new BadRequestException('Orden no encontrada');
    }

    if (order.status !== OrderStatus.NEW) {
      throw new BadRequestException('Solo se pueden cancelar órdenes en estado NEW');
    }

    order.status = OrderStatus.CANCELLED;
    return this.orderRepository.save(order);
  }

  async findByUser(userId: number, status?: OrderStatus): Promise<Order[]> {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    return this.orderRepository.find({
      where,
      relations: ['instrument'],
      order: { datetime: 'DESC' },
    });
  }
} 