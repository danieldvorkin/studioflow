# frozen_string_literal: true

module Mutations
  class BaseMutation < GraphQL::Schema::RelayClassicMutation
    argument_class Types::BaseArgument
    field_class Types::BaseField
    input_object_class Types::BaseInputObject
    object_class Types::BaseObject

    private

    # Returns an error string if a client is trying to book a class that starts
    # within 2× the class duration from now (i.e. the booking window is closed).
    # Returns nil when the booking is allowed to proceed.
    def client_booking_cutoff_error(class_session, user)
      return nil unless user&.client?
      return nil unless class_session&.start_time

      duration = class_session.class_template&.duration_minutes
      duration = 50 unless duration.is_a?(Numeric) && duration.positive?
      deadline = class_session.start_time - (2 * duration).minutes
      return nil if Time.current < deadline

      "Bookings are closed — this class starts in less than #{2 * duration} minutes"
    end
  end
end
