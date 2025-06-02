import { Controller, Post, Body, Put, Param, Get, Query, Logger, ParseIntPipe } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { OrderStatus } from '../entities/order.entity';
import { Order } from '../entities/order.entity';

@Controller('orders')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) {
    this.logger.log('OrderController initialized');
  }

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.debug('Creando orden con datos:', {
      userId: createOrderDto.userId,
      instrumentId: createOrderDto.instrumentId,
      type: createOrderDto.type,
      side: createOrderDto.side,
      size: createOrderDto.size,
      price: createOrderDto.price,
      totalAmount: createOrderDto.totalAmount
    });

    const result = await this.orderService.create(createOrderDto);
    this.logger.log(`Orden creada con ID: ${result.id}`);
    return result;
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body('userId', ParseIntPipe) userId: number
  ): Promise<Order> {
    this.logger.debug('Cancelando orden:', {
      orderId: id,
      userId: userId
    });

    const result = await this.orderService.cancel(id, userId);
    this.logger.log(`Orden ${id} cancelada para el usuario ${userId}`);
    return result;
  }

  @Get()
  async findAll(
    @Query('status') status: OrderStatus,
    @Query('userId', ParseIntPipe) userId: number
  ): Promise<Order[]> {
    this.logger.debug('Buscando órdenes con parámetros:', {
      status: status || 'ALL',
      userId: userId
    });

    const result = await this.orderService.findByUser(userId, status);
    this.logger.log(`Encontradas ${result.length} órdenes para el usuario ${userId}`);
    return result;
  }
} 