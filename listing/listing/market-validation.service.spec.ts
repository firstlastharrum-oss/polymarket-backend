import { Test, TestingModule } from '@nestjs/testing';
import { MarketValidationService } from './market-validation.service';
import { ConnectionService } from '../../src/connection/connection.service';

describe('MarketValidationService', () => {
  let service: MarketValidationService;
  let connectionServiceMock: any;

  beforeEach(async () => {
    connectionServiceMock = {
      listing: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketValidationService,
        {
          provide: ConnectionService,
          useValue: connectionServiceMock,
        },
      ],
    }).compile();

    service = module.get<MarketValidationService>(MarketValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkDuplicates', () => {
    it('should detect exact duplicates', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([{ title: 'Will Bitcoin hit 100k?' }]);
      const result = await service.validateMarket('Will Bitcoin hit 100k?', 'Description');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Duplicate market detected');
    });

    it('should detect similar duplicates', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([{ title: 'Will Bitcoin hit 100k?' }]);
      const result = await service.validateMarket('Will Bitcoin hit 100k', 'Description'); // Missing question mark, slight diff
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Similar market detected');
    });

    it('should allow distinct titles', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([{ title: 'Existing Market' }]);
      const result = await service.validateMarket('Totally New Market Will it rain in 2025?', 'Description');
      expect(result.isValid).toBe(true);
    });
  });

  describe('checkEthics', () => {
    it('should block harmful content', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([]);
      const result = await service.validateMarket('How to buy illegal drugs', 'Description');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Ethical Violation');
    });

    it('should block harassment', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([]);
      const result = await service.validateMarket('Why is Bob ugly?', 'Description');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Ethical Violation');
    });
  });

  describe('checkManipulationRisk', () => {
    it('should block personal markets', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([]);
      const result = await service.validateMarket('Will my friend pass the exam?', 'Description');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Manipulation Risk');
    });

    it('should block creator-controlled outcomes', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([]);
      const result = await service.validateMarket('I will decide the winner', 'Description');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Manipulation Risk');
    });
  });

  describe('checkValidity', () => {
    it('should require clear resolution criteria', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([]);
      const result = await service.validateMarket('Just random text', 'Description');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Market Validity');
    });

    it('should accept markets with dates', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([]);
      const result = await service.validateMarket('Will it rain on Jan 1st?', 'Description');
      expect(result.isValid).toBe(true);
    });
    
    it('should accept markets with condition keywords', async () => {
      connectionServiceMock.listing.findMany.mockResolvedValue([]);
      const result = await service.validateMarket('If X happens will Y happen?', 'Description');
      expect(result.isValid).toBe(true);
    });
  });
});
