class ClientPaymentMethod < ApplicationRecord
  belongs_to :studio
  belongs_to :client

  before_validation :infer_studio

  validates :stripe_payment_method_id, presence: true
  validates :stripe_payment_method_id, uniqueness: { scope: :client_id }

  private

  def infer_studio
    self.studio_id ||= client&.studio_id
  end
end
