import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from '../services/order.service';
import { OrderStatus, OrderType, OrderSide, Order } from '../entities/order.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { Instrument } from '../entities/instrument.entity';
import { User } from '../entities/user.entity';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: OrderService;

  const mockInstrument: Partial<Instrument> = {
    id: 1,
    type: 'ACCION',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    orders: [],
    marketData: []
  };

  const mockUser: Partial<User> = {
    id: 1,
    email: 'test@example.com',
    accountNumber: 'ACC123456',
    orders: []
  };

  const mockOrder: Partial<Order> = {
    id: 1,
    instrument: mockInstrument as Instrument,
    instrumentId: 1,
    user: mockUser as User,
    userId: 1,
    side: OrderSide.BUY,
    size: 100,
    price: 150.00,
    type: OrderType.MARKET,
    status: OrderStatus.NEW,
    datetime: new Date(),
    rejection_reason: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            create: jest.fn(),
            cancel: jest.fn(),
            findByUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get<OrderService>(OrderService);
  });

  describe('createOrder', () => {
    it('should create a MARKET order', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 1,
        instrumentId: 1,
        type: OrderType.MARKET,
        side: OrderSide.BUY,
        size: 100,
      };

      const expectedOrder: Partial<Order> = {
        id: 1,
        ...createOrderDto,
        instrument: mockInstrument as Instrument,
        user: mockUser as User,
        status: OrderStatus.FILLED,
        datetime: new Date(),
      };

      jest.spyOn(orderService, 'create').mockResolvedValue(expectedOrder as Order);

      const result = await controller.createOrder(createOrderDto);

      expect(result).toBe(expectedOrder);
      expect(orderService.create).toHaveBeenCalledWith(createOrderDto);
    });

    it('should create a LIMIT order', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 1,
        instrumentId: 1,
        type: OrderType.LIMIT,
        side: OrderSide.BUY,
        size: 100,
        price: 150.00,
      };

      const expectedOrder: Partial<Order> = {
        id: 1,
        ...createOrderDto,
        instrument: mockInstrument as Instrument,
        user: mockUser as User,
        status: OrderStatus.NEW,
        datetime: new Date(),
      };

      jest.spyOn(orderService, 'create').mockResolvedValue(expectedOrder as Order);

      const result = await controller.createOrder(createOrderDto);

      expect(result).toBe(expectedOrder);
      expect(orderService.create).toHaveBeenCalledWith(createOrderDto);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      const orderId = 1;
      const userId = 1;
      const expectedResult: Order = {
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order;

      jest.spyOn(orderService, 'cancel').mockResolvedValue(expectedResult);

      const result = await controller.cancel(orderId, userId);

      expect(result).toBe(expectedResult);
      expect(orderService.cancel).toHaveBeenCalledWith(orderId, userId);
    });
  });

  describe('getOrders', () => {
    it('should get orders with status', async () => {
      const status = OrderStatus.NEW;
      const userId = 1;
      const expectedOrders: Order[] = [
        mockOrder as Order,
        { ...mockOrder, id: 2 } as Order
      ];

      jest.spyOn(orderService, 'findByUser').mockResolvedValue(expectedOrders);

      const result = await controller.findAll(status, userId);

      expect(result).toBe(expectedOrders);
      expect(orderService.findByUser).toHaveBeenCalledWith(userId, status);
    });

    it('should get all orders without status', async () => {
      const userId = 1;
      const expectedOrders: Order[] = [{
        ...mockOrder,
        status: OrderStatus.FILLED,
      } as Order];

      jest.spyOn(orderService, 'findByUser').mockResolvedValue(expectedOrders);

      const result = await controller.findAll(undefined, userId);

      expect(result).toBe(expectedOrders);
      expect(orderService.findByUser).toHaveBeenCalledWith(userId, undefined);
    });
  });
}); 