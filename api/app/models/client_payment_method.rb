class ClientPaymentMethod < ApplicationRecord
  belongs_to :user
  belongs_to :client, optional: true
  belongs_to :studio, optional: true

  before_validation :infer_from_client

  validates :stripe_payment_method_id, presence: true
  validates :stripe_payment_method_id, uniqueness: { scope: :user_id }

  private

  def infer_from_client
    return unless client
    # Only infer user_id from the associated client. studio_id is intentionally
    # NOT inferred here because ClientPaymentMethod is user-scoped, not studio-scoped.
    self.user_id ||= client.user_id
  end
end
