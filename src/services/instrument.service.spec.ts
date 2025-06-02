import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstrumentService } from './instrument.service';
import { Instrument } from '../entities/instrument.entity';
import { BadRequestException, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';

describe('InstrumentService', () => {
  let service: InstrumentService;
  let repository: Repository<Instrument>;

  const mockRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeAll(() => {
    // Silenciar los logs durante los tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstrumentService,
        {
          provide: getRepositoryToken(Instrument),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<InstrumentService>(InstrumentService);
    repository = module.get<Repository<Instrument>>(getRepositoryToken(Instrument));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return an instrument when found', async () => {
      const mockInstrument = { id: 1, name: 'Test Instrument' };
      mockRepository.findOne.mockResolvedValue(mockInstrument);

      const result = await service.findOne(1);
      expect(result).toEqual(mockInstrument);
    });

    it('should throw NotFoundException when instrument not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('DB Error'));

      await expect(service.findOne(1)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('search', () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    beforeEach(() => {
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return empty results when query is empty', async () => {
      const result = await service.search('', 1, 10);
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });

    it('should throw BadRequestException when query exceeds max length', async () => {
      const longQuery = 'a'.repeat(51);
      await expect(service.search(longQuery, 1, 10)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when query contains invalid characters', async () => {
      await expect(service.search('test@123', 1, 10)).rejects.toThrow(BadRequestException);
    });

    it('should limit the maximum number of results', async () => {
      const mockItems = [{ id: 1, name: 'Test' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 1]);

      const result = await service.search('test', 1, 200);
      expect(result.limit).toBeLessThanOrEqual(100);
    });

    it('should convert query to uppercase for better matching', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.search('test', 1, 10);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: 'TEST',
        }),
      );
    });

    it('should handle successful search with results', async () => {
      const mockItems = [
        { id: 1, name: 'Test1' },
        { id: 2, name: 'Test2' },
      ];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockItems, 2]);

      const result = await service.search('test', 1, 10);
      expect(result).toEqual({
        items: mockItems,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockQueryBuilder.getManyAndCount.mockRejectedValue(new Error('DB Error'));

      await expect(service.search('test', 1, 10)).rejects.toThrow(InternalServerErrorException);
    });

    it('should trim whitespace from query', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      await service.search('  test  ', 1, 10);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: 'TEST',
        }),
      );
    });

    it('should enforce minimum page number', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      const result = await service.search('test', -1, 10);
      expect(result.page).toBe(1);
    });
  });
}); 