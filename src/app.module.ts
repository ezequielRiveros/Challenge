import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Instrument } from './entities/instrument.entity';
import { Order } from './entities/order.entity';
import { MarketData } from './entities/market-data.entity';
import { PortfolioController } from './controllers/portfolio.controller';
import { InstrumentController } from './controllers/instrument.controller';
import { OrderController } from './controllers/order.controller';
import { PortfolioService } from './services/portfolio.service';
import { InstrumentService } from './services/instrument.service';
import { OrderService } from './services/order.service';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'trading_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Instrument, Order, MarketData]),
  ],
  controllers: [PortfolioController, InstrumentController, OrderController],
  providers: [
    Logger,
    PortfolioService,
    InstrumentService,
    OrderService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {} 