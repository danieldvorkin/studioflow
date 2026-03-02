class Payment < ApplicationRecord
  belongs_to :studio
  belongs_to :booking, optional: true
  belongs_to :client, optional: true
  belongs_to :class_session, optional: true

  before_validation :infer_studio

  enum :status, {
    pending: "pending",
    succeeded: "succeeded",
    failed: "failed",
    refunded: "refunded"
  }, validate: true

  private

  def infer_studio
    self.studio_id ||= booking&.studio_id || client&.studio_id || class_session&.studio_id
  end
end
