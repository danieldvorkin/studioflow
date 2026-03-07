# frozen_string_literal: true

require "rails_helper"

RSpec.describe StudioPage, type: :model do
  let(:studio) { create(:studio) }

  # ── Helpers ──────────────────────────────────────────────────────────────────

  # Build an HTML snippet that contains a mock ActiveStorage redirect URL for
  # the given signed_id so we can test URL-scraping without a real upload.
  def blob_img_html(signed_id, filename: "photo.jpg")
    %(<img src="/rails/active_storage/blobs/redirect/#{signed_id}/#{filename}">)
  end

  # ── Validations ───────────────────────────────────────────────────────────────

  describe "validations" do
    subject(:page) { build(:studio_page, studio: studio) }

    it "is valid with valid attributes" do
      expect(page).to be_valid
    end

    it "requires a title" do
      page.title = ""
      expect(page).not_to be_valid
      expect(page.errors[:title]).to include("can't be blank")
    end

    it "requires position to be an integer >= 0" do
      page.position = -1
      expect(page).not_to be_valid
    end

    it "requires slug to be unique within the same studio" do
      create(:studio_page, studio: studio, slug: "my-page")
      duplicate = build(:studio_page, studio: studio, slug: "my-page")
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:slug]).to be_present
    end

    it "allows the same slug on a different studio" do
      other_studio = create(:studio)
      create(:studio_page, studio: studio, slug: "shared-slug")
      other_page   = build(:studio_page, studio: other_studio, slug: "shared-slug")
      expect(other_page).to be_valid
    end
  end

  # ── Slug auto-generation ──────────────────────────────────────────────────────

  describe "#generate_slug" do
    it "generates a slug from the title when slug is blank" do
      page = create(:studio_page, studio: studio, title: "My Great Page", slug: nil)
      expect(page.slug).to eq("my-great-page")
    end

    it "appends a numeric suffix to avoid duplicates" do
      create(:studio_page, studio: studio, title: "Yoga Class", slug: nil)
      second = create(:studio_page, studio: studio, title: "Yoga Class", slug: nil)
      expect(second.slug).to eq("yoga-class-1")
    end
  end

  # ── Scopes ────────────────────────────────────────────────────────────────────

  describe "scopes" do
    let!(:unpublished) { create(:studio_page, studio: studio, published: false) }
    let!(:published)   { create(:studio_page, :published, studio: studio)       }

    describe ".published" do
      it "returns only published pages" do
        expect(StudioPage.published).to include(published)
        expect(StudioPage.published).not_to include(unpublished)
      end
    end

    describe ".ordered" do
      it "returns pages ordered by position ascending" do
        last_page  = create(:studio_page, studio: studio, position: 10)
        first_page = create(:studio_page, studio: studio, position: 1)
        ordered    = studio.studio_pages.ordered
        expect(ordered.index(first_page)).to be < ordered.index(last_page)
      end
    end
  end

  # ── Image purge on content change ─────────────────────────────────────────────

  describe "#purge_removed_images" do
    let(:signed_id_a) { "abc123signedid" }
    let(:signed_id_b) { "xyz789signedid" }
    let(:blob_a)      { instance_double(ActiveStorage::Blob, purge_later: true) }
    let(:blob_b)      { instance_double(ActiveStorage::Blob, purge_later: true) }

    before do
      allow(ActiveStorage::Blob).to receive(:find_signed).with(signed_id_a).and_return(blob_a)
      allow(ActiveStorage::Blob).to receive(:find_signed).with(signed_id_b).and_return(blob_b)
    end

    context "when an image is removed from content" do
      it "purges the removed blob" do
        page = create(:studio_page, studio: studio, content: blob_img_html(signed_id_a))

        expect(blob_a).to receive(:purge_later)
        page.update!(content: "<p>No images anymore</p>")
      end
    end

    context "when an image is retained in content" do
      it "does not purge the retained blob" do
        page = create(:studio_page, studio: studio, content: blob_img_html(signed_id_a))

        expect(blob_a).not_to receive(:purge_later)
        page.update!(content: "#{blob_img_html(signed_id_a)}<p>extra text</p>")
      end
    end

    context "when one image is removed and another is kept" do
      it "purges only the removed blob" do
        initial = "#{blob_img_html(signed_id_a)}#{blob_img_html(signed_id_b)}"
        page    = create(:studio_page, studio: studio, content: initial)

        expect(blob_a).to receive(:purge_later)
        expect(blob_b).not_to receive(:purge_later)
        page.update!(content: blob_img_html(signed_id_b))
      end
    end

    context "when a new image is added (no removal)" do
      it "does not purge any blob" do
        page = create(:studio_page, studio: studio, content: blob_img_html(signed_id_a))

        expect(blob_a).not_to receive(:purge_later)
        expect(blob_b).not_to receive(:purge_later)
        page.update!(content: "#{blob_img_html(signed_id_a)}#{blob_img_html(signed_id_b)}")
      end
    end

    context "when content is changed but contained no images" do
      it "does not attempt to purge anything" do
        page = create(:studio_page, studio: studio, content: "<p>plain text</p>")
        expect(blob_a).not_to receive(:purge_later)
        page.update!(content: "<p>different plain text</p>")
      end
    end

    context "when a non-content attribute is updated" do
      it "does not trigger the purge callback" do
        page = create(:studio_page, studio: studio, content: blob_img_html(signed_id_a))
        expect(blob_a).not_to receive(:purge_later)
        page.update!(published: true)
      end
    end

    context "when the signed_id in content is invalid" do
      it "warns and does not raise" do
        page = create(:studio_page, studio: studio, content: blob_img_html("bad-signed-id"))
        allow(ActiveStorage::Blob).to receive(:find_signed).with("bad-signed-id")
          .and_raise(ActiveSupport::MessageVerifier::InvalidSignature)

        expect(Rails.logger).to receive(:warn).with(/InvalidSignature/)
        expect { page.update!(content: "<p>gone</p>") }.not_to raise_error
      end
    end

    context "when the content uses the /proxy/ URL variant" do
      it "still detects and purges the removed blob" do
        proxy_html = %(<img src="/rails/active_storage/blobs/proxy/#{signed_id_a}/photo.jpg">)
        page       = create(:studio_page, studio: studio, content: proxy_html)

        expect(blob_a).to receive(:purge_later)
        page.update!(content: "<p>removed</p>")
      end
    end
  end
end
