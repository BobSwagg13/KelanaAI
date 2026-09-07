'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  tripFormSchema,
  MAX_TRIP_DAYS,
  type TripFormData,
  type SelectedLocation,
} from '@/lib/types/trip';
import { CURRENCY_OPTIONS } from '@/lib/utils/budget';
import { MONTH_OPTIONS } from '@/lib/constants/months';
import { DestinationInput } from './DestinationInput';
import { FormField } from './FormField';
import { TravelStyleSelector } from './TravelStyleSelector';
import { TravelGroupSelector } from './TravelGroupSelector';
import { CostBreakdown } from './CostBreakdown';
import { Button } from '@/components/shared/Button';

export interface TravelFormProps {
  selectedLocation: SelectedLocation | null;
  /**
   * Called when a destination is picked via the search box inside the form.
   * Shares the same callback the parent passes to DestinationMap, so a typed
   * selection and a map click update the identical piece of state — no
   * separate store needed to keep the two in sync.
   */
  onLocationSelect?: (location: SelectedLocation) => void;
  onSubmit: (data: TripFormData) => void | Promise<void>;
  isLoading: boolean;
  /** Pre-populate the form, e.g. when editing an existing trip. */
  initialValues?: TripFormData;
  submitLabel?: string;
  loadingLabel?: string;
}

const EMPTY_DEFAULTS: TripFormData = {
  destination: '',
  country: '',
  latitude: 0,
  longitude: 0,
  days: 5,
  budget: 1000,
  currency: 'USD',
  travel_month: '',
  travel_style: '',
  travel_group: '',
};

export function TravelForm({
  selectedLocation,
  onLocationSelect,
  onSubmit,
  isLoading,
  initialValues,
  submitLabel = 'Plan My Trip',
  loadingLabel = 'Planning your trip...',
}: TravelFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<TripFormData>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: initialValues ?? EMPTY_DEFAULTS,
    // Needed for a live `isValid`, which gates the submit button below. Under
    // the default 'onSubmit' mode isValid is not kept current, so the button
    // enabled as soon as a map pin existed and only then reported the fields
    // that were still empty.
    mode: 'onTouched',
  });

  const budget = watch('budget');
  const currency = watch('currency');
  const hotelCost = watch('hotel_cost');
  const foodCost = watch('food_cost');
  const transportCost = watch('transport_cost');
  const miscCost = watch('miscellaneous_cost');

  // The destination fields are not registered inputs — they are driven by the
  // map selection, so they have to be written into the form imperatively.
  useEffect(() => {
    if (selectedLocation) {
      setValue('destination', selectedLocation.name, { shouldValidate: true });
      setValue('country', selectedLocation.country, { shouldValidate: true });
      setValue('country_code', selectedLocation.country_code);
      setValue('latitude', selectedLocation.latitude, { shouldValidate: true });
      setValue('longitude', selectedLocation.longitude, { shouldValidate: true });
    }
  }, [selectedLocation, setValue]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      aria-busy={isLoading}
      className="flex flex-col gap-6 rounded-2xl bg-white p-5 sm:p-8 shadow-sm border border-brand-border"
    >
      <fieldset disabled={isLoading} className="flex flex-col gap-6">
        <DestinationInput selectedLocation={selectedLocation} onLocationSelect={onLocationSelect} />
        {errors.destination && (
          <p role="alert" className="-mt-4 text-sm text-red-600">
            {errors.destination.message}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField<TripFormData>
            label="Number of Days"
            name="days"
            type="number"
            min={1}
            max={MAX_TRIP_DAYS}
            required
            valueAsNumber
            register={register}
            error={errors.days}
          />
          <FormField<TripFormData>
            label="Budget"
            name="budget"
            type="number"
            min={0}
            step={0.01}
            required
            valueAsNumber
            register={register}
            error={errors.budget}
          />
          <FormField<TripFormData>
            label="Currency"
            name="currency"
            type="select"
            options={CURRENCY_OPTIONS}
            required
            register={register}
            error={errors.currency}
          />
          <FormField<TripFormData>
            label="Travel Month"
            name="travel_month"
            type="select"
            options={MONTH_OPTIONS}
            required
            register={register}
            error={errors.travel_month}
          />
        </div>

        <Controller
          control={control}
          name="travel_style"
          render={({ field }) => (
            <TravelStyleSelector
              value={field.value}
              onChange={field.onChange}
              error={errors.travel_style?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="travel_group"
          render={({ field }) => (
            <TravelGroupSelector
              value={field.value}
              onChange={field.onChange}
              error={errors.travel_group?.message}
            />
          )}
        />

        <CostBreakdown
          budget={budget || 0}
          currency={currency}
          costs={{
            hotel_cost: hotelCost,
            food_cost: foodCost,
            transport_cost: transportCost,
            miscellaneous_cost: miscCost,
          }}
          onChange={(costs) => {
            setValue('hotel_cost', costs.hotel_cost);
            setValue('food_cost', costs.food_cost);
            setValue('transport_cost', costs.transport_cost);
            setValue('miscellaneous_cost', costs.miscellaneous_cost);
          }}
        />

        <Button
          type="submit"
          size="lg"
          loading={isLoading}
          disabled={!selectedLocation || !isValid}
          data-testid="submit-trip"
          className="mt-2 self-start"
        >
          {isLoading ? loadingLabel : submitLabel}
        </Button>
        {/* Say which of the two things is missing, rather than letting the
            button enable on the map pin alone and only surfacing the empty
            fields once it is pressed. */}
        {!selectedLocation ? (
          <p className="text-sm text-brand-muted -mt-4">
            Select a destination on the map to continue.
          </p>
        ) : (
          !isValid && (
            <p className="text-sm text-brand-muted -mt-4">
              Fill in the remaining fields to continue.
            </p>
          )
        )}
      </fieldset>
    </form>
  );
}
