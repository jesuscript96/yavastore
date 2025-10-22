import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useOrdersStore } from '../store/ordersStore'
import { ORDER_SOURCE } from '../lib/supabase'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function CreateOrder() {
  const [loading, setLoading] = useState(false)
  const { business } = useAuthStore()
  const { createOrder } = useOrdersStore()
  const navigate = useNavigate()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      delivery_time: '',
      notes: '',
      products: [{ name: '', quantity: 1, price: 0 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'products'
  })

  const watchedProducts = watch('products')

  const calculateTotal = () => {
    return watchedProducts.reduce((total, product) => {
      return total + (product.quantity * product.price)
    }, 0)
  }

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const totalAmount = calculateTotal()
      
      const orderData = {
        business_id: business.id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        products: data.products,
        total_amount: totalAmount,
        delivery_time: data.delivery_time,
        status: 'pending',
        source: ORDER_SOURCE.MANUAL,
        notes: data.notes || null
      }

      const { error } = await createOrder(orderData)
      
      if (error) {
        toast.error('Error al crear el pedido')
      } else {
        toast.success('Pedido creado exitosamente')
        navigate('/orders')
      }
    } catch (error) {
      toast.error('Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  const addProduct = () => {
    append({ name: '', quantity: 1, price: 0 })
  }

  const removeProduct = (index) => {
    if (fields.length > 1) {
      remove(index)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/orders')}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>
          <p className="text-gray-600">Crea un pedido manual para tu negocio</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Información del Cliente</h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700">
                Nombre del Cliente *
              </label>
              <input
                {...register('customer_name', { required: 'El nombre es requerido' })}
                type="text"
                className={`input mt-1 ${errors.customer_name ? 'input-error' : ''}`}
                placeholder="Juan Pérez"
              />
              {errors.customer_name && (
                <p className="mt-1 text-sm text-danger-600">{errors.customer_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700">
                Teléfono *
              </label>
              <input
                {...register('customer_phone', { 
                  required: 'El teléfono es requerido',
                  pattern: {
                    value: /^[0-9+\-\s()]+$/,
                    message: 'Formato de teléfono inválido'
                  }
                })}
                type="tel"
                className={`input mt-1 ${errors.customer_phone ? 'input-error' : ''}`}
                placeholder="+1 234 567 8900"
              />
              {errors.customer_phone && (
                <p className="mt-1 text-sm text-danger-600">{errors.customer_phone.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="customer_address" className="block text-sm font-medium text-gray-700">
                Dirección de Entrega *
              </label>
              <textarea
                {...register('customer_address', { required: 'La dirección es requerida' })}
                rows={3}
                className={`input mt-1 ${errors.customer_address ? 'input-error' : ''}`}
                placeholder="Calle 123, Colonia, Ciudad"
              />
              {errors.customer_address && (
                <p className="mt-1 text-sm text-danger-600">{errors.customer_address.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Time */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Hora de Entrega</h2>
          </div>
          <div className="card-body">
            <div>
              <label htmlFor="delivery_time" className="block text-sm font-medium text-gray-700">
                Fecha y Hora *
              </label>
              <input
                {...register('delivery_time', { required: 'La fecha y hora son requeridas' })}
                type="datetime-local"
                className={`input mt-1 ${errors.delivery_time ? 'input-error' : ''}`}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.delivery_time && (
                <p className="mt-1 text-sm text-danger-600">{errors.delivery_time.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Productos</h2>
              <button
                type="button"
                onClick={addProduct}
                className="btn-secondary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Producto
              </button>
            </div>
          </div>
          <div className="card-body space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del Producto
                  </label>
                  <input
                    {...register(`products.${index}.name`, { required: 'El nombre es requerido' })}
                    type="text"
                    className={`input ${errors.products?.[index]?.name ? 'input-error' : ''}`}
                    placeholder="Producto"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    {...register(`products.${index}.quantity`, { 
                      required: 'La cantidad es requerida',
                      min: { value: 1, message: 'Mínimo 1' }
                    })}
                    type="number"
                    min="1"
                    className={`input ${errors.products?.[index]?.quantity ? 'input-error' : ''}`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio
                  </label>
                  <div className="flex">
                    <input
                      {...register(`products.${index}.price`, { 
                        required: 'El precio es requerido',
                        min: { value: 0, message: 'Mínimo 0' }
                      })}
                      type="number"
                      step="0.01"
                      min="0"
                      className={`input rounded-r-none ${errors.products?.[index]?.price ? 'input-error' : ''}`}
                    />
                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      $
                    </span>
                  </div>
                </div>
                
                {fields.length > 1 && (
                  <div className="sm:col-span-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="text-danger-600 hover:text-danger-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Total */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Total:</span>
                <span className="text-xl font-bold text-primary-600">
                  ${calculateTotal().toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Notas Adicionales</h2>
          </div>
          <div className="card-body">
            <textarea
              {...register('notes')}
              rows={3}
              className="input"
              placeholder="Instrucciones especiales, comentarios, etc."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : null}
            Crear Pedido
          </button>
        </div>
      </form>
    </div>
  )
}
