# frozen_string_literal: true

# Shared helper for resolvers/mutations that need to operate against a
# Stripe-configured studio on behalf of a client user.
#
# A client may belong to multiple studios via Client records. When no
# studio_id is explicitly supplied (e.g. from the profile page) we scan
# all of the user's client records and return the first studio that actually
# has Stripe configured. This ensures that profile-level payment management
# is never blocked just because the user's *primary* studio lacks Stripe.
module BillingStudioResolver
  # Returns [client, payment_settings, studio] for the best billing studio.
  # - If studio_id is given, uses exactly that studio (returns nil triple if not configured).
  # - Otherwise, walks the user's Client records until one has Stripe configured.
  # - Returns [nil, nil, nil] if no suitable studio is found.
  def resolve_billing_studio(user, studio_id: nil)
    if studio_id.present?
      studio  = Studio.find_by(id: studio_id)
      return [ nil, nil, nil ] unless studio

      settings = PaymentSetting.instance_for(studio)
      client   = Client.find_by(user_id: user.id, studio_id: studio.id)
      return settings.configured? && client ? [ client, settings, studio ] : [ nil, nil, nil ]
    end

    # No studio specified — find the first of the user's studios that has Stripe.
    # Order by the user's primary studio first so the common case is fast.
    studio_ids = Client.where(user_id: user.id).pluck(:studio_id)
    # Put user.studio_id first if present so we prefer it when it's configured.
    primary = user.studio_id
    ordered_ids = ([ primary ] + studio_ids).uniq.compact

    ordered_ids.each do |sid|
      studio   = Studio.find_by(id: sid)
      next unless studio

      settings = PaymentSetting.instance_for(studio)
      next unless settings.configured?

      client = Client.find_by(user_id: user.id, studio_id: sid)
      next unless client

      return [ client, settings, studio ]
    end

    [ nil, nil, nil ]
  end
end
