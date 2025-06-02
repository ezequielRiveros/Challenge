import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from './order.service';
import { Order, OrderStatus, OrderType, OrderSide } from '../entities/order.entity';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { Instrument } from '../entities/instrument.entity';
import { MarketData } from '../entities/market-data.entity';
import { PortfolioService } from './portfolio.service';
import { BadRequestException } from '@nestjs/common';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: Repository<Order>;
  let instrumentRepository: Repository<Instrument>;
  let marketDataRepository: Repository<MarketData>;
  let portfolioService: PortfolioService;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockInstrumentRepository = {
    findOne: jest.fn(),
  };

  const mockMarketDataRepository = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockPortfolioService = {
    getPortfolio: jest.fn(),
  };

  const mockInstrument = { id: 1, name: 'Test Instrument' };
  const mockLatestPrice = { close: 100 };
  const mockPortfolio = {
    availableCash: 10000,
    positions: [
      { instrumentId: 1, quantity: 100, averagePrice: 90 },
    ],
  };

  const baseOrderDto = {
    instrumentId: 1,
    userId: 1,
    type: OrderType.MARKET,
    side: OrderSide.BUY,
    size: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Instrument),
          useValue: mockInstrumentRepository,
        },
        {
          provide: getRepositoryToken(MarketData),
          useValue: mockMarketDataRepository,
        },
        {
          provide: PortfolioService,
          useValue: mockPortfolioService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    instrumentRepository = module.get<Repository<Instrument>>(getRepositoryToken(Instrument));
    marketDataRepository = module.get<Repository<MarketData>>(getRepositoryToken(MarketData));
    portfolioService = module.get<PortfolioService>(PortfolioService);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup default mock responses
    mockInstrumentRepository.findOne.mockResolvedValue(mockInstrument);
    mockMarketDataRepository.getOne.mockResolvedValue(mockLatestPrice);
    mockPortfolioService.getPortfolio.mockResolvedValue(mockPortfolio);
    mockOrderRepository.create.mockImplementation(dto => dto);
    mockOrderRepository.save.mockImplementation(order => order);
  });

  describe('Validaciones de parámetros', () => {
    describe('1. Validaciones de userId e instrumentId', () => {
      it('debería rechazar cuando userId es nulo', async () => {
        const orderDto = {
          ...baseOrderDto,
          userId: null,
        };
        
        await expect(service.create(orderDto)).rejects.toThrow(
          new BadRequestException('El userId es requerido')
        );
      });

      it('debería rechazar cuando instrumentId es nulo', async () => {
        const orderDto = {
          ...baseOrderDto,
          instrumentId: null,
        };
        
        await expect(service.create(orderDto)).rejects.toThrow(
          new BadRequestException('El instrumentId es requerido')
        );
      });

      it('debería rechazar cuando el instrumento no existe', async () => {
        mockInstrumentRepository.findOne.mockResolvedValue(null);
        
        await expect(service.create(baseOrderDto)).rejects.toThrow(
          new BadRequestException('Instrumento no encontrado')
        );
      });
    });

    describe('2. Validaciones de tipo de orden', () => {
      it('debería rechazar cuando el tipo de orden es nulo', async () => {
        const orderDto = {
          ...baseOrderDto,
          type: null,
        };
        
        await expect(service.create(orderDto)).rejects.toThrow(
          new BadRequestException('El tipo de orden es requerido')
        );
      });

      it('debería rechazar cuando el tipo de orden es inválido', async () => {
        const orderDto = {
          ...baseOrderDto,
          type: 'INVALID_TYPE' as OrderType,
        };
        
        await expect(service.create(orderDto)).rejects.toThrow(
          new BadRequestException('Tipo de orden inválido')
        );
      });

      it('debería rechazar órdenes LIMIT sin precio', async () => {
        const orderDto = {
          ...baseOrderDto,
          type: OrderType.LIMIT,
          price: undefined,
        };
        
        await expect(service.create(orderDto)).rejects.toThrow(
          new BadRequestException('Las órdenes LIMIT requieren un precio')
        );
      });

      it('debería rechazar órdenes LIMIT con precio menor o igual a 0', async () => {
        const orderDto = {
          ...baseOrderDto,
          type: OrderType.LIMIT,
          price: 0,
          size: 10,
        };
        
        await expect(service.create(orderDto)).rejects.toThrow(
          new BadRequestException('Las órdenes LIMIT requieren un precio')
        );
      });
    });

    describe('3. Validaciones de cantidad o monto total', () => {
      it('debería rechazar cuando no se especifica ni size ni totalAmount', async () => {
        const orderDto = {
          ...baseOrderDto,
          size: undefined,
          totalAmount: undefined,
        };
        
        await expect(service.create(orderDto)).rejects.toThrow(
          new BadRequestException('Debe especificar size o totalAmount')
        );
      });

      it('debería rechazar cuando se especifican tanto size como totalAmount', async () => {
        const orderDto = {
          ...baseOrderDto,
          size: 10,
          totalAmount: 1000,
        };
        
        await expect(service.create(orderDto)).rejects.toThrow(
          new BadRequestException('No puede especificar tanto la cantidad como el monto total. Elija uno.')
        );
      });

      describe('Validaciones de size', () => {
        it('debería rechazar cuando size es menor o igual a 0', async () => {
          const orderDto = {
            ...baseOrderDto,
            size: 0,
            totalAmount: undefined,
          };
          
          await expect(service.create(orderDto)).rejects.toThrow(
            new BadRequestException('Debe especificar size o totalAmount')
          );
        });

        it('debería rechazar cuando size no es un número entero', async () => {
          const orderDto = {
            ...baseOrderDto,
            size: 10.5,
            totalAmount: undefined,
          };
          
          await expect(service.create(orderDto)).rejects.toThrow(
            new BadRequestException('La cantidad debe ser un número entero')
          );
        });
      });

      describe('Validaciones de totalAmount', () => {
        it('debería rechazar cuando totalAmount es menor o igual a 0', async () => {
          const orderDto = {
            ...baseOrderDto,
            size: undefined,
            totalAmount: 0,
          };
          
          await expect(service.create(orderDto)).rejects.toThrow(
            new BadRequestException('Debe especificar size o totalAmount')
          );
        });

        it('debería rechazar cuando el totalAmount es insuficiente para una unidad', async () => {
          mockMarketDataRepository.getOne.mockResolvedValue({ close: 1000 });
          
          const orderDto = { 
            ...baseOrderDto,
            size: undefined,
            totalAmount: 500,
          };
          
          await expect(service.create(orderDto)).rejects.toThrow(
            new BadRequestException('El monto total de 500 es insuficiente para comprar al menos una unidad al precio actual de 1000')
          );
        });
      });
    });
  });

  describe('Validaciones de negocio', () => {
    it('debería rechazar orden de compra por fondos insuficientes', async () => {
      mockPortfolioService.getPortfolio.mockResolvedValue({
        availableCash: 500,
        positions: [],
      });

      const orderDto = { 
        ...baseOrderDto,
        size: 10,
      };

      const result = await service.create(orderDto);
      
      expect(result.status).toBe(OrderStatus.REJECTED);
      expect(result.rejection_reason).toBe('Fondos insuficientes para ejecutar la orden');
    });

    it('debería rechazar orden de venta por tenencia insuficiente', async () => {
      const orderDto = { 
        ...baseOrderDto,
        side: OrderSide.SELL,
        size: 200,
      };

      const result = await service.create(orderDto);
      
      expect(result.status).toBe(OrderStatus.REJECTED);
      expect(result.rejection_reason).toBe('Tenencia insuficiente para ejecutar la orden');
    });
  });

  describe('Cálculo de tamaño de orden', () => {
    it('debería calcular correctamente el tamaño cuando se especifica totalAmount', async () => {
      mockMarketDataRepository.getOne.mockResolvedValue({ close: 100 });
      
      const orderDto = { 
        ...baseOrderDto,
        size: undefined,
        totalAmount: 1500,
      };

      const result = await service.create(orderDto);
      
      expect(result.size).toBe(15); // 1500/100 = 15
    });

    it('debería mantener el tamaño exacto cuando se especifica size', async () => {
      const orderDto = { 
        ...baseOrderDto,
        size: 10,
      };

      const result = await service.create(orderDto);
      
      expect(result.size).toBe(10);
    });

    it('debería redondear hacia abajo cuando el totalAmount no es exactamente divisible', async () => {
      mockMarketDataRepository.getOne.mockResolvedValue({ close: 100 });
      
      const orderDto = { 
        ...baseOrderDto,
        size: undefined,
        totalAmount: 1550,
      };

      const result = await service.create(orderDto);
      
      expect(result.size).toBe(15); // 1550/100 = 15.5 -> floor(15.5) = 15
    });
  });

  describe('cancel', () => {
    it('debería cancelar una orden NEW', async () => {
      const mockOrder = {
        id: 1,
        status: OrderStatus.NEW,
      };
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockImplementation(order => order);

      const result = await service.cancel(1, 1);
      
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('debería rechazar cancelación de orden no encontrada', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.cancel(1, 1)).rejects.toThrow(
        new BadRequestException('Orden no encontrada')
      );
    });

    it('debería rechazar cancelación de orden no cancelable', async () => {
      const mockOrder = {
        id: 1,
        status: OrderStatus.FILLED,
      };
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(service.cancel(1, 1)).rejects.toThrow(
        new BadRequestException('Solo se pueden cancelar órdenes en estado NEW')
      );
    });
  });

  describe('findByUser', () => {
    it('debería encontrar órdenes por usuario', async () => {
      const mockOrders = [
        { id: 1, userId: 1 },
        { id: 2, userId: 1 },
      ];
      mockOrderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.findByUser(1);
      
      expect(result).toEqual(mockOrders);
      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['instrument'],
        order: { datetime: 'DESC' },
      });
    });

    it('debería filtrar por estado si se especifica', async () => {
      const mockOrders = [
        { id: 1, userId: 1, status: OrderStatus.FILLED },
      ];
      mockOrderRepository.find.mockResolvedValue(mockOrders);

      const result = await service.findByUser(1, OrderStatus.FILLED);
      
      expect(result).toEqual(mockOrders);
      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { userId: 1, status: OrderStatus.FILLED },
        relations: ['instrument'],
        order: { datetime: 'DESC' },
      });
    });
  });
}); 