import { IsInt, IsUUID, Min } from 'class-validator';

export class AddPackageServiceDto {
  @IsUUID()
  serviceId: string;

  @IsInt()
  @Min(1)
  quantity: number = 1;
}
