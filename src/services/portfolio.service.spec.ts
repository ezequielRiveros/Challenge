import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioService } from './portfolio.service';
import { Order, OrderStatus, OrderSide, OrderType } from '../entities/order.entity';
import { Instrument } from '../entities/instrument.entity';
import { MarketData } from '../entities/market-data.entity';
import { NotFoundException } from '@nestjs/common';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let orderRepository: Repository<Order>;
  let instrumentRepository: Repository<Instrument>;
  let marketDataRepository: Repository<MarketData>;

  const mockArsInstrument: Partial<Instrument> = {
    id: 1,
    type: 'MONEDA',
    ticker: 'ARS',
    name: 'Peso Argentino',
  };

  const mockAppleInstrument: Partial<Instrument> = {
    id: 2,
    type: 'ACCION',
    ticker: 'AAPL',
    name: 'Apple Inc.',
  };

  const mockMeliInstrument: Partial<Instrument> = {
    id: 3,
    type: 'ACCION',
    ticker: 'MELI',
    name: 'MercadoLibre',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Instrument),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MarketData),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    instrumentRepository = module.get<Repository<Instrument>>(getRepositoryToken(Instrument));
    marketDataRepository = module.get<Repository<MarketData>>(getRepositoryToken(MarketData));
  });

  describe('getPortfolio', () => {
    it('should return empty portfolio when no orders exist', async () => {
      jest.spyOn(orderRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);
      
      const result = await service.getPortfolio(1);
      
      expect(result).toEqual({
        totalValue: 0,
        availableCash: 0,
        positions: [],
      });
    });

    it('should throw NotFoundException when ARS instrument is not found', async () => {
      jest.spyOn(orderRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{}]),
      } as any);
      jest.spyOn(instrumentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPortfolio(1)).rejects.toThrow(NotFoundException);
    });

    it('should calculate portfolio with cash operations only', async () => {
      const mockOrders = [
        {
          id: 1,
          instrumentId: mockArsInstrument.id,
          instrument: mockArsInstrument,
          side: OrderSide.CASH_IN,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 1000,
          price: 1,
        },
        {
          id: 2,
          instrumentId: mockArsInstrument.id,
          instrument: mockArsInstrument,
          side: OrderSide.CASH_OUT,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 300,
          price: 1,
        },
      ] as Order[];

      jest.spyOn(orderRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOrders),
      } as any);
      jest.spyOn(instrumentRepository, 'findOne').mockResolvedValue(mockArsInstrument as Instrument);

      const result = await service.getPortfolio(1);

      expect(result).toEqual({
        totalValue: 700,
        availableCash: 700,
        positions: [],
      });
    });

    it('should calculate portfolio with stock positions and valid market data', async () => {
      const mockOrders = [
        {
          id: 1,
          instrumentId: mockArsInstrument.id,
          instrument: mockArsInstrument,
          side: OrderSide.CASH_IN,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 2000,
          price: 1,
        },
        {
          id: 2,
          instrumentId: mockAppleInstrument.id,
          instrument: mockAppleInstrument,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 5,
          price: 180,
        },
        {
          id: 3,
          instrumentId: mockMeliInstrument.id,
          instrument: mockMeliInstrument,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 2,
          price: 300,
        },
      ] as Order[];

      const mockMarketData = [
        {
          instrumentId: mockAppleInstrument.id,
          close: 200,
          previousClose: 180,
          datetime: new Date(),
        },
        {
          instrumentId: mockMeliInstrument.id,
          close: 320,
          previousClose: 300,
          datetime: new Date(),
        },
      ] as MarketData[];

      jest.spyOn(orderRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOrders),
      } as any);
      jest.spyOn(instrumentRepository, 'findOne').mockResolvedValue(mockArsInstrument as Instrument);
      jest.spyOn(marketDataRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMarketData),
      } as any);

      const result = await service.getPortfolio(1);

      expect(result.totalValue).toBe(2140);
      expect(result.availableCash).toBe(500);
      expect(result.positions).toHaveLength(2);
      expect(result.positions[0]).toEqual({
        ticker: 'AAPL',
        quantity: 5,
        marketValue: 1000,
        dailyReturn: expect.closeTo(11.11, 2),
        returnPercentage: expect.closeTo(11.11, 2),
        averagePrice: 180,
        instrumentId: mockAppleInstrument.id,
        name: mockAppleInstrument.name,
      });
      expect(result.positions[1]).toEqual({
        ticker: 'MELI',
        quantity: 2,
        marketValue: 640,
        dailyReturn: expect.closeTo(6.67, 2),
        returnPercentage: expect.closeTo(6.67, 2),
        averagePrice: 300,
        instrumentId: mockMeliInstrument.id,
        name: mockMeliInstrument.name,
      });
    });

    it('should calculate portfolio with a single stock position', async () => {
      const mockOrders = [
        {
          id: 1,
          instrumentId: mockAppleInstrument.id,
          instrument: mockAppleInstrument,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 10,
          price: 150,
        },
      ] as Order[];

      const mockMarketData = [
        {
          instrumentId: mockAppleInstrument.id,
          close: 180,
          previousClose: 150,
          datetime: new Date(),
        },
      ] as MarketData[];

      jest.spyOn(orderRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOrders),
      } as any);
      jest.spyOn(instrumentRepository, 'findOne').mockResolvedValue(mockArsInstrument as Instrument);
      jest.spyOn(marketDataRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMarketData),
      } as any);

      const result = await service.getPortfolio(1);

      expect(result.positions[0]).toEqual(
        expect.objectContaining({
          ticker: 'AAPL',
          quantity: 10,
          marketValue: 1800,
          dailyReturn: 20,
          returnPercentage: 20,
          averagePrice: 150,
          instrumentId: mockAppleInstrument.id,
          name: mockAppleInstrument.name,
        })
      );
    });

    it('should calculate portfolio with multiple buy and sell operations', async () => {
      const mockOrders = [
        {
          id: 1,
          instrumentId: mockAppleInstrument.id,
          instrument: mockAppleInstrument,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 10,
          price: 100,
        },
        {
          id: 2,
          instrumentId: mockAppleInstrument.id,
          instrument: mockAppleInstrument,
          side: OrderSide.BUY,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 5,
          price: 120,
        },
        {
          id: 3,
          instrumentId: mockAppleInstrument.id,
          instrument: mockAppleInstrument,
          side: OrderSide.SELL,
          type: OrderType.MARKET,
          status: OrderStatus.FILLED,
          size: 8,
          price: 150,
        },
      ] as Order[];

      const mockMarketData = [
        {
          instrumentId: mockAppleInstrument.id,
          close: 180,
          previousClose: 150,
          datetime: new Date(),
        },
      ] as MarketData[];

      jest.spyOn(orderRepository, 'createQueryBuilder').mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOrders),
      } as any);
      jest.spyOn(instrumentRepository, 'findOne').mockResolvedValue(mockArsInstrument as Instrument);
      jest.spyOn(marketDataRepository, 'createQueryBuilder').mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMarketData),
      } as any);

      const result = await service.getPortfolio(1);

      expect(result.positions[0]).toEqual(
        expect.objectContaining({
          ticker: 'AAPL',
          quantity: 7,
          marketValue: 1260,
          dailyReturn: 20,
          returnPercentage: expect.any(Number),
          averagePrice: expect.any(Number),
          instrumentId: mockAppleInstrument.id,
          name: mockAppleInstrument.name,
        })
      );
    });
  });
}); 