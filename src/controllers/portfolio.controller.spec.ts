import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from '../services/portfolio.service';

describe('PortfolioController', () => {
  let controller: PortfolioController;
  let portfolioService: PortfolioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioController],
      providers: [
        {
          provide: PortfolioService,
          useValue: {
            getPortfolio: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PortfolioController>(PortfolioController);
    portfolioService = module.get<PortfolioService>(PortfolioService);
  });

  describe('getPortfolio', () => {
    it('should return user portfolio', async () => {
      const expectedPortfolio = {
        totalValue: 10000,
        availableCash: 5000,
        positions: [{
          instrumentId: 1,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          quantity: 10,
          marketValue: 1500,
          returnPercentage: 5.5,
          dailyReturn: 2.3,
          averagePrice: 145.5
        }]
      };

      jest.spyOn(portfolioService, 'getPortfolio').mockResolvedValue(expectedPortfolio);

      const userId = 1;
      const result = await controller.getPortfolio(userId);

      expect(result).toBe(expectedPortfolio);
      expect(portfolioService.getPortfolio).toHaveBeenCalledWith(1);
    });

    it('should return empty portfolio when user has no positions', async () => {
      const userId = 1;
      const emptyPortfolio = {
        totalValue: 0,
        availableCash: 0,
        positions: [],
      };

      jest.spyOn(portfolioService, 'getPortfolio').mockResolvedValue(emptyPortfolio);

      const result = await controller.getPortfolio(userId);

      expect(result).toBe(emptyPortfolio);
      expect(portfolioService.getPortfolio).toHaveBeenCalledWith(1);
    });

    it('should handle errors', async () => {
      const userId = 1;
      jest.spyOn(portfolioService, 'getPortfolio').mockRejectedValue(new Error('Test error'));

      await expect(controller.getPortfolio(userId)).rejects.toThrow('Test error');
    });
  });
}); 