import React, { useState, useEffect, useRef } from 'react';
import { graphql, usePreloadedQuery, useMutation, useQueryLoader } from 'react-relay';
import type { SupplierListQuery } from '../__generated__/SupplierListQuery.graphql.ts';

// Define the query using Relay's graphql template literal
const suppliersQuery = graphql`
  query SupplierListQuery($page: Int, $pageSize: Int) {
    suppliers(page: $page, pageSize: $pageSize) {
      items {
        id
        name
        address
        city
        state
        zipCode
        country
        contactName
        contactEmail
        contactPhone
        website
        createdAt
        updatedAt
      }
      totalItems
      page
      pageSize
      numPages
    }
  }
`;

// Define the create supplier mutation
const createSupplierMutation = graphql`
  mutation SupplierListCreateMutation($input: CreateSupplierInput!) {
    createSupplier(input: $input) {
      id
      name
      address
      city
      state
      zipCode
      country
      contactName
      contactEmail
      contactPhone
      website
      createdAt
      updatedAt
    }
  }
`;

// Define the delete supplier mutation
const deleteSupplierMutation = graphql`
  mutation SupplierListDeleteMutation($id: ID!) {
    deleteSupplier(id: $id)
  }
`;

// Define the bulk import suppliers mutation
const importSuppliersMutation = graphql`
  mutation SupplierListImportMutation($suppliers: [CreateSupplierInput!]!) {
    importSuppliers(suppliers: $suppliers) {
      id
      name
      address
      city
      state
      zipCode
      country
      contactName
      contactEmail
      contactPhone
      website
      createdAt
      updatedAt
    }
  }
`;

interface Supplier {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateSupplierInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
}

// Internal component that uses preloaded query
const SupplierListContent = ({ 
  queryRef, 
  loadQuery 
}: { 
  queryRef: any; 
  loadQuery: (variables: { page: number; pageSize: number }, options?: { fetchPolicy?: string }) => void;
}) => {
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [isImportPending, setIsImportPending] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createForm, setCreateForm] = useState<CreateSupplierInput>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: ''
  });

  const data = usePreloadedQuery<SupplierListQuery>(suppliersQuery, queryRef);

  const [createSupplier, isCreatePending] = useMutation(createSupplierMutation);
  const [deleteSupplier, isDeletePending] = useMutation(deleteSupplierMutation);
  const [importSuppliers] = useMutation(importSuppliersMutation);

  const suppliers = data.suppliers?.items || [];
  const totalItems = data.suppliers?.totalItems || 0;

  const handleCreateSupplier = () => {
    if (createForm.name.trim() && createForm.contactEmail.trim()) {
      const input = {
        ...createForm,
        website: createForm.website || undefined
      };
      
      createSupplier({
        variables: { input },
        onCompleted: () => {
          setCreateForm({
            name: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            contactName: '',
            contactEmail: '',
            contactPhone: '',
            website: ''
          });
          setShowCreateForm(false);
          // Force network fetch to bypass cache
          loadQuery(
            { page: 0, pageSize: 10 },
            { fetchPolicy: 'network-only' }
          );
        },
        onError: (error) => {
          console.error('Error creating supplier:', error);
        }
      });
    }
  };

  const handleDeleteSupplier = (supplierId: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      deleteSupplier({
        variables: { id: supplierId },
        onCompleted: (response) => {
          if (response.deleteSupplier) {
            // Force network fetch to bypass cache and show updated list
            loadQuery(
              { page: 0, pageSize: 10 },
              { fetchPolicy: 'network-only' }
            );
          }
        },
        onError: (error) => {
          console.error('Error deleting supplier:', error);
        }
      });
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateForm({
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      website: ''
    });
  };

  const parseCSV = (csvText: string): CreateSupplierInput[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const suppliers: CreateSupplierInput[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;

      // Simple CSV parsing (handles quoted fields)
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Push the last value

      const supplier: CreateSupplierInput = {
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        website: ''
      };

      // Map CSV columns to supplier fields
      headers.forEach((header, index) => {
        const value = values[index] || '';
        switch (header.toLowerCase()) {
          case 'name':
            supplier.name = value;
            break;
          case 'address':
            supplier.address = value;
            break;
          case 'city':
            supplier.city = value;
            break;
          case 'state':
            supplier.state = value;
            break;
          case 'zipcode':
          case 'zip_code':
            supplier.zipCode = value;
            break;
          case 'country':
            supplier.country = value;
            break;
          case 'contactname':
          case 'contact_name':
            supplier.contactName = value;
            break;
          case 'contactemail':
          case 'contact_email':
            supplier.contactEmail = value;
            break;
          case 'contactphone':
          case 'contact_phone':
            supplier.contactPhone = value;
            break;
          case 'website':
            supplier.website = value || undefined;
            break;
        }
      });

      // Validate required fields
      if (supplier.name && supplier.contactEmail) {
        suppliers.push(supplier);
      }
    }

    return suppliers;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setIsImportPending(true);

    try {
      const text = await file.text();
      const suppliersData = parseCSV(text);

      if (suppliersData.length === 0) {
        alert('No valid supplier data found in CSV file');
        setIsImportPending(false);
        return;
      }

      importSuppliers({
        variables: { suppliers: suppliersData },
        onCompleted: (response) => {
          alert(`Successfully imported ${response.importSuppliers?.length || 0} suppliers`);
          setIsImportPending(false);
          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          // Refresh the list
          loadQuery(
            { page: 0, pageSize: 10 },
            { fetchPolicy: 'network-only' }
          );
        },
        onError: (error) => {
          console.error('Error importing suppliers:', error);
          alert('Error importing suppliers. Please check the file format and try again.');
          setIsImportPending(false);
        }
      });
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the file format.');
      setIsImportPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexFlow: 'column', textAlign: 'left' }}>
      <h1>Suppliers</h1>
      
      <div className="Form">
        <button 
          onClick={() => setShowCreateForm(true)}
          disabled={showCreateForm}
          style={{ marginBottom: '20px', marginRight: '10px' }}
        >
          Add New Supplier
        </button>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isImportPending}
          style={{ marginBottom: '20px' }}
        >
          {isImportPending ? 'Importing...' : 'Import CSV'}
        </button>
      </div>

      {showCreateForm && (
        <div className="Form" style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
          <h3>Create New Supplier</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label>Name *</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                placeholder="Supplier name"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>Contact Name *</label>
              <input
                value={createForm.contactName}
                onChange={(e) => setCreateForm({...createForm, contactName: e.target.value})}
                placeholder="Contact person name"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>Address *</label>
              <input
                value={createForm.address}
                onChange={(e) => setCreateForm({...createForm, address: e.target.value})}
                placeholder="Street address"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>Email *</label>
              <input
                type="email"
                value={createForm.contactEmail}
                onChange={(e) => setCreateForm({...createForm, contactEmail: e.target.value})}
                placeholder="contact@supplier.com"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>City *</label>
              <input
                value={createForm.city}
                onChange={(e) => setCreateForm({...createForm, city: e.target.value})}
                placeholder="City"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>Phone *</label>
              <input
                value={createForm.contactPhone}
                onChange={(e) => setCreateForm({...createForm, contactPhone: e.target.value})}
                placeholder="(555) 123-4567"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>State *</label>
              <input
                value={createForm.state}
                onChange={(e) => setCreateForm({...createForm, state: e.target.value})}
                placeholder="State"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>Website</label>
              <input
                value={createForm.website}
                onChange={(e) => setCreateForm({...createForm, website: e.target.value})}
                placeholder="https://supplier.com"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>Zip Code *</label>
              <input
                value={createForm.zipCode}
                onChange={(e) => setCreateForm({...createForm, zipCode: e.target.value})}
                placeholder="12345"
                disabled={isCreatePending}
              />
            </div>
            <div>
              <label>Country *</label>
              <input
                value={createForm.country}
                onChange={(e) => setCreateForm({...createForm, country: e.target.value})}
                placeholder="Country"
                disabled={isCreatePending}
              />
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={handleCreateSupplier}
              disabled={isCreatePending || !createForm.name.trim() || !createForm.contactEmail.trim()}
              style={{ marginRight: '10px' }}
            >
              {isCreatePending ? 'Creating...' : 'Create Supplier'}
            </button>
            <button
              onClick={handleCancelCreate}
              disabled={isCreatePending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {totalItems === 0 && !showCreateForm && "No suppliers found. Create one to get started!"}
      
      {suppliers.map((supplier: Supplier) => (
        <div key={supplier.id} className="Form" style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 5px 0' }}>
                #{supplier.id} {supplier.name}
              </h4>
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                <div><strong>Contact:</strong> {supplier.contactName} ({supplier.contactEmail})</div>
                <div><strong>Address:</strong> {supplier.address}, {supplier.city}, {supplier.state} {supplier.zipCode}, {supplier.country}</div>
                <div><strong>Phone:</strong> {supplier.contactPhone}</div>
                {supplier.website && <div><strong>Website:</strong> <a href={supplier.website} target="_blank" rel="noopener noreferrer">{supplier.website}</a></div>}
              </div>
            </div>
            <div>
              <a 
                href="#" 
                className="App-link"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Edit functionality coming in Phase 3!');
                }}
                style={{ marginRight: '10px' }}
              >
                edit
              </a>
              <a 
                href="#" 
                className="App-link"
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteSupplier(supplier.id);
                }}
                style={{ 
                  opacity: isDeletePending ? 0.5 : 1,
                  pointerEvents: isDeletePending ? 'none' : 'auto'
                }}
              >
                {isDeletePending ? 'deleting...' : 'delete'}
              </a>
            </div>
          </div>
        </div>
      ))}
      
      <div className="Form">
        <div style={{ display: 'flex' }}>
          <button disabled={true}>{`<< (Coming Soon)`}</button>
          <span style={{ flex: 1, textAlign: 'center' }}>
            Page {(data.suppliers?.page || 0) + 1} of {data.suppliers?.numPages || 1}
          </span>
          <button disabled={true}>{`>> (Coming Soon)`}</button>
        </div>
      </div>
    </div>
  );
};

// Outer component that manages query loading
export const SupplierList = () => {
  const [queryRef, loadQuery] = useQueryLoader<SupplierListQuery>(suppliersQuery);
  
  // Load the query initially
  useEffect(() => {
    loadQuery({ page: 0, pageSize: 10 });
  }, [loadQuery]);

  // Show loading state until query is loaded
  if (!queryRef) {
    return <div>Loading suppliers...</div>;
  }

  return (
    <SupplierListContent 
      queryRef={queryRef} 
      loadQuery={loadQuery}
    />
  );
};