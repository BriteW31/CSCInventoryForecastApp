export class LeadTimeUtils {
  
  static getMaxLeadTimeDays(leadTimes: number[]): number {
    return Math.max(...leadTimes);
  }

  static getAverageLeadTimeDays(leadTimes: number[]): number {
    if (!leadTimes || leadTimes.length === 0) {
      return 0; 
    }

    const sum = leadTimes.reduce((a, b) => a + b, 0);
    const daily = sum / leadTimes.length;
    return daily;
  }

  static getMaxLeadTimeMonths(leadTimes: number[]): number {
    const maxDays = this.getMaxLeadTimeDays(leadTimes);
    return maxDays / 30.5;
  }

  static getAverageLeadTimeMonths(leadTimes: number[]): number {
    const averageDays = this.getAverageLeadTimeDays(leadTimes);
    const months = averageDays / 30.5;
    return months;
  }

  static getSDLeadTimesDays(leadTimes: number[]): number {
    if (leadTimes.length < 2) {
      return 0; // Standard deviation is not defined for 1 or 0 values
    }

    const average = this.getAverageLeadTimeDays(leadTimes);
    
    const sumSquaredDiff = leadTimes.reduce((acc, lead) => {
      return acc + Math.pow(lead - average, 2);
    }, 0);

    const variance = sumSquaredDiff / (leadTimes.length - 1); // Sample standard deviation
    return Math.sqrt(variance);
  }

  static getSDLeadTimesMonths(leadTimes: number[]): number {
    const sd = this.getSDLeadTimesDays(leadTimes);
    return sd / 30.5;
  }
}
