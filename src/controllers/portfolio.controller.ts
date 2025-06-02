import { Controller, Get, Param, ParseIntPipe, HttpStatus } from '@nestjs/common';
import { PortfolioService } from '../services/portfolio.service';
import { PortfolioDto } from '../dtos/portfolio.dto';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get(':userId')
  async getPortfolio(
    @Param('userId', new ParseIntPipe({ 
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      exceptionFactory: () => {
        throw new Error('El ID de usuario debe ser un número válido');
      }
    })) 
    userId: number
  ): Promise<PortfolioDto> {
    return this.portfolioService.getPortfolio(userId);
  }
} 