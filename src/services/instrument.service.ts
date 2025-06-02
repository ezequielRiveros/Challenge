import { Injectable, Logger, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Instrument } from '../entities/instrument.entity';

export interface SearchResponse {
  items: Instrument[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class InstrumentService {
  private readonly logger = new Logger(InstrumentService.name);
  private readonly MAX_QUERY_LENGTH = 50;
  private readonly MAX_LIMIT = 100;

  constructor(
    @InjectRepository(Instrument)
    private instrumentRepository: Repository<Instrument>,
  ) {
    this.logger.log('InstrumentService initialized');
  }

  async findOne(id: number): Promise<Instrument> {
    try {
      let instrument = await this.instrumentRepository.findOne({
        where: { id },
      });

      if (!instrument) {
        this.logger.warn(`Instrumento con ID ${id} no encontrado`);
        throw new NotFoundException(`Instrumento con ID ${id} no encontrado`);
      }

      return instrument;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error(`Error al buscar instrumento con ID ${id}: ${error.message}`);
      this.logger.debug(error.stack);
      throw new InternalServerErrorException('Error al buscar el instrumento');
    }
  }

  async search(query: string, page: number = 1, limit: number = 10): Promise<SearchResponse> {
    try {
      this.logger.debug('Iniciando búsqueda con parámetros:', { query, page, limit });
      
      if (!query) {
        this.logger.warn('Búsqueda sin query, retornando lista vacía');
        return {
          items: [],
          total: 0,
          page,
          limit
        };
      }

      query = query.trim();
      this.logger.log('Query procesado:', query);
      
      if (query.length > this.MAX_QUERY_LENGTH) {
        this.logger.warn(`Query excede longitud máxima: ${query.length}`);
        throw new BadRequestException(`La búsqueda no puede exceder ${this.MAX_QUERY_LENGTH} caracteres`);
      }

      if (!/^[a-zA-Z0-9\s.]+$/.test(query)) {
        this.logger.warn(`Query contiene caracteres inválidos: ${query}`);
        throw new BadRequestException('La búsqueda solo puede contener letras, números, espacios y puntos');
      }
      
      limit = Math.min(limit, this.MAX_LIMIT);
      page = Math.max(1, page);
      
      this.logger.debug('Ejecutando consulta a base de datos');
      const [items, total] = await this.instrumentRepository
        .createQueryBuilder('instrument')
        .where('instrument.ticker % :query OR instrument.name % :query', { 
          query: query.toUpperCase() 
        })
        .orderBy('GREATEST(similarity(instrument.ticker, :query), similarity(instrument.name, :query))', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      this.logger.log(`Búsqueda completada. Encontrados ${total} resultados`);
      
      return {
        items,
        total,
        page,
        limit
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error al buscar instrumentos con query "${query}": ${error.message}`);
      throw new InternalServerErrorException('Error al buscar instrumentos');
    }
  }
} 