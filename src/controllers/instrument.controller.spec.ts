import { Test, TestingModule } from '@nestjs/testing';
import { InstrumentController } from './instrument.controller';
import { InstrumentService } from '../services/instrument.service';
import { SearchInstrumentDto } from '../dtos/search-instrument.dto';
import { BadRequestException, Logger } from '@nestjs/common';

describe('InstrumentController', () => {
  let controller: InstrumentController;
  let service: InstrumentService;

  const mockInstrumentService = {
    search: jest.fn(),
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
      controllers: [InstrumentController],
      providers: [
        {
          provide: InstrumentService,
          useValue: mockInstrumentService,
        },
      ],
    }).compile();

    controller = module.get<InstrumentController>(InstrumentController);
    service = module.get<InstrumentService>(InstrumentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call service.search with DTO values', async () => {
      const searchDto = new SearchInstrumentDto();
      searchDto.query = 'test';
      searchDto.page = 1;
      searchDto.limit = 10;

      const expectedResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockInstrumentService.search.mockResolvedValue(expectedResponse);

      const result = await controller.search(searchDto);

      expect(service.search).toHaveBeenCalledWith('test', 1, 10);
      expect(result).toEqual(expectedResponse);
    });

    it('should use default values when not provided in DTO', async () => {
      const searchDto = new SearchInstrumentDto();
      searchDto.query = 'test';

      const expectedResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockInstrumentService.search.mockResolvedValue(expectedResponse);

      await controller.search(searchDto);

      expect(service.search).toHaveBeenCalledWith('test', 1, 10);
    });

    it('should handle service errors', async () => {
      const searchDto = new SearchInstrumentDto();
      searchDto.query = 'test';

      mockInstrumentService.search.mockRejectedValue(new BadRequestException('Error message'));

      await expect(controller.search(searchDto)).rejects.toThrow(BadRequestException);
    });

    it('should trim query in DTO', async () => {
      const searchDto = new SearchInstrumentDto();
      searchDto.query = '  test  ';
      
      const expectedResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockInstrumentService.search.mockResolvedValue(expectedResponse);

      await controller.search(searchDto);

      expect(service.search).toHaveBeenCalledWith('test', 1, 10);
    });

    it('should handle custom page and limit values', async () => {
      const searchDto = new SearchInstrumentDto();
      searchDto.query = 'test';
      searchDto.page = 2;
      searchDto.limit = 20;

      const expectedResponse = {
        items: [],
        total: 0,
        page: 2,
        limit: 20,
      };

      mockInstrumentService.search.mockResolvedValue(expectedResponse);

      const result = await controller.search(searchDto);

      expect(service.search).toHaveBeenCalledWith('test', 2, 20);
      expect(result).toEqual(expectedResponse);
    });
  });
}); 