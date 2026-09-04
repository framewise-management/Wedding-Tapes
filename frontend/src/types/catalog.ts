export interface Service {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  flatPrice: number | null;
  active: boolean;
}

export interface PackageItem {
  id: string;
  serviceId: string;
  service: Service;
  quantity: number;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  items: PackageItem[];
}
