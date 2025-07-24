/* This file is generated and managed by tsync */

/** Struct representing a row in table `suppliers` */
interface Suppliers {
  /** Field representing column `id` */
  id: number;
  /** Field representing column `name` */
  name: string;
  /** Field representing column `address` */
  address: string;
  /** Field representing column `city` */
  city: string;
  /** Field representing column `state` */
  state: string;
  /** Field representing column `zip_code` */
  zip_code: string;
  /** Field representing column `country` */
  country: string;
  /** Field representing column `contact_name` */
  contact_name: string;
  /** Field representing column `contact_email` */
  contact_email: string;
  /** Field representing column `contact_phone` */
  contact_phone: string;
  /** Field representing column `website` */
  website?: string;
  /** Field representing column `created_at` */
  created_at: Date;
  /** Field representing column `updated_at` */
  updated_at: Date;
}

/** Create Struct for a row in table `suppliers` for [`Suppliers`] */
interface CreateSuppliers {
  /** Field representing column `name` */
  name: string;
  /** Field representing column `address` */
  address: string;
  /** Field representing column `city` */
  city: string;
  /** Field representing column `state` */
  state: string;
  /** Field representing column `zip_code` */
  zip_code: string;
  /** Field representing column `country` */
  country: string;
  /** Field representing column `contact_name` */
  contact_name: string;
  /** Field representing column `contact_email` */
  contact_email: string;
  /** Field representing column `contact_phone` */
  contact_phone: string;
  /** Field representing column `website` */
  website?: string;
}

/** Update Struct for a row in table `suppliers` for [`Suppliers`] */
interface UpdateSuppliers {
  /** Field representing column `name` */
  name?: string;
  /** Field representing column `address` */
  address?: string;
  /** Field representing column `city` */
  city?: string;
  /** Field representing column `state` */
  state?: string;
  /** Field representing column `zip_code` */
  zip_code?: string;
  /** Field representing column `country` */
  country?: string;
  /** Field representing column `contact_name` */
  contact_name?: string;
  /** Field representing column `contact_email` */
  contact_email?: string;
  /** Field representing column `contact_phone` */
  contact_phone?: string;
  /** Field representing column `website` */
  website?: string;
  /** Field representing column `created_at` */
  created_at?: Date;
  /** Field representing column `updated_at` */
  updated_at?: Date;
}

/** Result of a `.paginate` function */
interface PaginationResult<T> {
  /** Resulting items that are from the current page */
  items: Array<T>;
  /** The count of total items there are */
  total_items: number;
  /** Current page, 0-based index */
  page: number;
  /** Size of a page */
  page_size: number;
  /** Number of total possible pages, given the `page_size` and `total_items` */
  num_pages: number;
}

/** Struct representing a row in table `todo` */
interface Todo {
  /** Field representing column `id` */
  id: number;
  /** Field representing column `text` */
  text: string;
  /** Field representing column `created_at` */
  created_at: Date;
  /** Field representing column `updated_at` */
  updated_at: Date;
}

/** Create Struct for a row in table `todo` for [`Todo`] */
interface CreateTodo {
  /** Field representing column `text` */
  text: string;
}

/** Update Struct for a row in table `todo` for [`Todo`] */
interface UpdateTodo {
  /** Field representing column `text` */
  text?: string;
  /** Field representing column `created_at` */
  created_at?: Date;
  /** Field representing column `updated_at` */
  updated_at?: Date;
}

/** Result of a `.paginate` function */
interface PaginationResult<T> {
  /** Resulting items that are from the current page */
  items: Array<T>;
  /** The count of total items there are */
  total_items: number;
  /** Current page, 0-based index */
  page: number;
  /** Size of a page */
  page_size: number;
  /** Number of total possible pages, given the `page_size` and `total_items` */
  num_pages: number;
}

interface ChatRequest {
  message: string;
}

interface ChatStreamRequest {
  message: string;
}

interface ChatResponse {
  response: string;
}

interface FileInfo {
  id: number;
  key: string;
  name: string;
  url?: string;
}

interface PaginationParams {
  page: number;
  page_size: number;
}

interface PaginationParams {
  page: number;
  page_size: number;
}
