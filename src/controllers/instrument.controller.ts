import { Controller, Get, Query } from '@nestjs/common';
import { InstrumentService, SearchResponse } from '../services/instrument.service';
import { SearchInstrumentDto } from '../dtos/search-instrument.dto';

@Controller('instruments')
export class InstrumentController {
  constructor(private readonly instrumentService: InstrumentService) {}

  @Get('search')
  async search(
    @Query() searchDto: SearchInstrumentDto
  ): Promise<SearchResponse> {
    return this.instrumentService.search(
      searchDto.query,
      searchDto.page,
      searchDto.limit
    );
  }
} 