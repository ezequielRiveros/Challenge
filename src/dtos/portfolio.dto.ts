export class PositionDto {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  marketValue: number;
  returnPercentage: number;
  dailyReturn: number;
  averagePrice: number;
}

export class PortfolioDto {
  totalValue: number;
  availableCash: number;
  positions: PositionDto[];
} 