import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSupplier();
    }
  }, [id]);

  const fetchSupplier = async () => {
    try {
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data);
    } catch (error) {
      console.error('Error fetching supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!supplier) {
    return <div>Supplier not found</div>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/pengaturan/supplier')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali
      </Button>

      <div className="bg-white rounded-lg shadow p-6">
        {supplier.cover_image && (
          <img
            src={supplier.cover_image}
            alt={supplier.name}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}
        <h1 className="text-3xl font-bold mb-4">{supplier.name}</h1>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{supplier.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Telp</p>
            <p className="font-medium">{supplier.phone || '-'}</p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">List Barang</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {supplier.items?.map((item: any) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">{item.unit || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

