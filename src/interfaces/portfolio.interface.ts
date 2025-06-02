export interface Position {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  marketValue: number;
  dailyReturn: number;
}

export interface Portfolio {
  totalValue: number;
  availableCash: number;
  positions: Position[];
} 