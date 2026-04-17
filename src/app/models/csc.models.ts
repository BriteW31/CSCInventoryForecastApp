import { getZScore } from '../utils/zscore.utils';
import { LeadTimeUtils } from '../utils/lead-time.utils';

export class CSC {
  constructor(
    public jan: number, public feb: number, public mar: number,
    public apr: number, public may: number, public jun: number,
    public jul: number, public aug: number, public sep: number,
    public octo: number, public nov: number, public dec: number,
    public srv: number, public rate: number, public leadTimes: number[]
  ) {}

  getAverageLeadTimeDays(): number {
    return LeadTimeUtils.getAverageLeadTimeDays(this.leadTimes);
  }

  getAverageLeadTimeDaysRounded(): number {
    return Math.round(this.getAverageLeadTimeDays());
  }

  getMaxLeadTimeDays(): number {
    return LeadTimeUtils.getMaxLeadTimeDays(this.leadTimes);
  }

  getAverageLeadTimeMonths(): number {
    return LeadTimeUtils.getAverageLeadTimeMonths(this.leadTimes);
  }

  getAverageLeadTimeMonthsRounded(): number {
    return Math.round(this.getAverageLeadTimeMonths());
  }

  getMaxLeadTimeMonths(): number {
    return LeadTimeUtils.getMaxLeadTimeMonths(this.leadTimes);
  }

  getSDFromLeadTimeDays(): number {
    return LeadTimeUtils.getSDLeadTimesDays(this.leadTimes);
  }

  getSDFromLeadTimeDaysRounded(): number {
    const val = this.getSDFromLeadTimeDays();
    return Math.round(val * 100) / 100;
  }

  getSDFromLeadTimeMonths(): number {
    return LeadTimeUtils.getSDLeadTimesMonths(this.leadTimes);
  }

  getSDFromLeadTimeMonthsRounded(): number {
    const val = this.getSDFromLeadTimeMonths();
    return Math.round(val * 100) / 100;
  }

  getNumberOfDeliveries(): number {
    return this.leadTimes.length;
  }

  getTargetedServiceRate(): number {
    return this.rate;
  }

  getZScoreValue(): number {
    return getZScore(this.rate);
  }

  getTotal(): number {
    return (this.jan + this.feb + this.mar + this.apr + this.may + this.jun +
            this.jul + this.aug + this.sep + this.octo + this.nov + this.dec);
  }

  getMean(): number {
    return this.getTotal() / 12;
  }

  getMeanRounded(): number {
    // return Math.round(this.getMean());
    return Number(this.getMean().toFixed(2));
  }

  getMeanDaily(): number {
    return this.getTotal() / 365.25;
  }

  getMeanDailyRounded(): number {
    // const val = this.getMeanDaily();
    // return Math.round(val * 10) / 10;
    return Number(this.getMeanDaily().toFixed(2));
  }

  getSDFromTotal(): number {
    const mean = this.getMean();
    const months = [
      this.jan, this.feb, this.mar, this.apr, this.may, this.jun,
      this.jul, this.aug, this.sep, this.octo, this.nov, this.dec
    ];

    const sumSquaredDiff = months.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    const variance = sumSquaredDiff / 11;
    
    return Math.sqrt(variance);
  }

  getSDFromTotalRounded(): number {
    const val = this.getSDFromTotal();
    return Math.round(val * 10) / 10;
  }

  getSafetyStock(): number {
    return this.getZScoreValue() * this.getSDFromTotal() * Math.sqrt(this.getAverageLeadTimeMonths());
  }

  getSafetyStockRounded(): number {
    return Math.round(this.getSafetyStock());
  }

  getSafetyStockWithLeadTime(): number {
    const avgLeadMonth = this.getAverageLeadTimeMonths();
    const sdTotal = this.getSDFromTotal();
    const mean = this.getMean();
    const sdLeadMonth = this.getSDFromLeadTimeMonths();

    // Python: math.sqrt((avgLead * (sdTotal^2)) + (mean * sdLead)^2)
    const part1 = avgLeadMonth * Math.pow(sdTotal, 2);
    const part2 = Math.pow(mean * sdLeadMonth, 2);
    
    return this.getZScoreValue() * Math.sqrt(part1 + part2);
  }

  getSafetyStockWithLeadTimeRounded(): number {
    return Math.round(this.getSafetyStockWithLeadTime());
  }

  getReorderPoint(): number {
    const leadTime = this.getMean() * this.getAverageLeadTimeMonths();
    const reorder = this.getSafetyStock() + leadTime;
    return Math.ceil(reorder);
  }

  getReorderPointWithLeadTime(): number {
    const leadTime = this.getMeanDaily() * this.getAverageLeadTimeDays();
    const reorder = this.getSafetyStockWithLeadTime() + leadTime;
    return Math.ceil(reorder);
  }

  getReorderQuantity(): number {
    const daily = this.getMeanDaily();
    const reorderQuantity = daily * 365.25 - this.getReorderPointWithLeadTime();
    return Math.round(reorderQuantity);
  }

  getReorderQuantityNumDays(): { [key: number]: number } {
    // const reorder = this.getReorderQuantity();
    const daily = this.getMeanDaily();
    const quantity: { [key: number]: number } = {};
    
    // Create a Set to remove duplicates, then iterate
    const uniqueLeadTimes = Array.from(new Set(this.leadTimes));
    
    uniqueLeadTimes.forEach(lead => {
      const leadTimeReorder = daily * lead;
      // const leadTimeReorder = reorder * (lead / 365.25);
      quantity[lead] = Math.round(leadTimeReorder);
    });

    // Note: JS Objects are not guaranteed to be sorted by key like Python dictionaries,
    // but most modern browsers will display integer keys in order.
    return quantity;
  }
}
