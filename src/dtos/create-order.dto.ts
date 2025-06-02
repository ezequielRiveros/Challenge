import { IsEnum, IsNumber, IsOptional, Min, IsInt } from 'class-validator';
import { OrderType, OrderSide } from '../entities/order.entity';

export class CreateOrderDto {
  @IsInt()
  instrumentId: number;

  @IsInt()
  userId: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsEnum(OrderType)
  type: OrderType;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsOptional()
  @IsNumber()
  size?: number;

  @IsOptional()
  @IsNumber()
  totalAmount?: number;
} 