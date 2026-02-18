import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import anime from "animejs";
import api from "../lib/api";
import { ArrowLeft, Truck, Mail, Phone, Package } from "lucide-react";
import Button from "../components/ui/Button";

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const itemCardRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (id) {
      fetchSupplier();
    }
  }, [id]);

  // Entrance animations
  useEffect(() => {
    if (loading || !supplier) return;
    if (pageRef.current) {
      anime({
        targets: pageRef.current,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 400,
        easing: "easeOutCubic",
      });
    }
    if (headerRef.current) {
      anime({
        targets: headerRef.current,
        opacity: [0, 1],
        translateY: [16, 0],
        duration: 450,
        delay: 80,
        easing: "easeOutCubic",
      });
    }
    if (contactRef.current) {
      anime({
        targets: contactRef.current,
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 400,
        delay: 160,
        easing: "easeOutCubic",
      });
    }
    if (gridRef.current) {
      anime({
        targets: gridRef.current,
        opacity: [0, 1],
        duration: 400,
        delay: 240,
        easing: "easeOutCubic",
      });
    }
  }, [loading, supplier]);

  // Stagger item cards
  useEffect(() => {
    if (!supplier?.items?.length || loading) return;
    itemCardRefs.current = itemCardRefs.current.slice(0, supplier.items.length);
    const targets = itemCardRefs.current.filter(Boolean);
    if (targets.length === 0) return;
    anime({
      targets,
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 400,
      delay: anime.stagger(50, { start: 360 }),
      easing: "easeOutCubic",
    });
  }, [supplier?.items, loading]);

  const fetchSupplier = async () => {
    try {
      const res = await api.get(`/suppliers/${id}`);
      setSupplier(res.data);
    } catch (error) {
      console.error("Error fetching supplier:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" role="status" aria-live="polite">
        <div className="h-10 w-36 rounded-lg bg-muted animate-pulse" />
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="h-56 bg-muted animate-pulse" />
          <div className="p-6 space-y-6">
            <div className="h-9 w-1/3 bg-muted rounded-lg animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded-lg animate-pulse" />
              <div className="h-16 bg-muted rounded-lg animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-muted rounded-xl animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
        <p className="sr-only">Memuat detail supplier...</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[50vh] gap-4 animate-fade-in"
        role="alert"
      >
        <Truck className="w-16 h-16 text-muted-foreground" aria-hidden />
        <h2 className="text-xl font-semibold">Supplier tidak ditemukan</h2>
        <p className="text-muted-foreground text-center max-w-sm">
          Supplier yang Anda cari mungkin telah dihapus atau ID tidak valid.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate("/pengaturan/supplier")}
          aria-label="Kembali ke pengaturan supplier"
        >
          <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="space-y-6" role="main">
      <Button
        variant="outline"
        onClick={() => navigate("/pengaturan/supplier")}
        aria-label="Kembali ke pengaturan supplier"
        className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
        Kembali
      </Button>

      <article
        ref={headerRef}
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
      >
        {supplier.cover_image && (
          <figure className="relative h-48 md:h-64 overflow-hidden">
            <img
              src={supplier.cover_image}
              alt={`Cover ${supplier.name}`}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
              aria-hidden
            />
          </figure>
        )}
        <div className="p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Truck className="w-8 h-8 text-primary shrink-0" aria-hidden />
            {supplier.name}
          </h1>
        </div>
      </article>

      <section
        ref={contactRef}
        aria-labelledby="contact-heading"
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
      >
        <div className="p-6">
          <h2 id="contact-heading" className="text-lg font-semibold mb-4">
            Informasi Kontak
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <Mail className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden />
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="font-medium mt-1">
                  {supplier.email ? (
                    <a
                      href={`mailto:${supplier.email}`}
                      className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {supplier.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <Phone className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden />
              <div>
                <dt className="text-sm text-muted-foreground">Telepon</dt>
                <dd className="font-medium mt-1">
                  {supplier.phone ? (
                    <a
                      href={`tel:${supplier.phone}`}
                      className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {supplier.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </section>

      <section
        ref={gridRef}
        aria-labelledby="items-heading"
        className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
      >
        <div className="p-6">
          <h2
            id="items-heading"
            className="text-xl font-semibold mb-6 flex items-center gap-2"
          >
            <Package className="w-5 h-5 text-primary" aria-hidden />
            Daftar Barang ({supplier.items?.length || 0})
          </h2>
          {!supplier.items?.length ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              role="status"
            >
              <Package className="w-12 h-12 text-muted-foreground/50 mb-3" aria-hidden />
              <p className="text-muted-foreground font-medium">
                Belum ada barang dari supplier ini
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Tambahkan barang dan hubungkan ke supplier ini
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplier.items?.map((item: any, idx: number) => (
                <a
                  key={item.id}
                  ref={(el) => {
                    itemCardRefs.current[idx] = el;
                  }}
                  href={`/barang/${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/barang/${item.id}`);
                  }}
                  className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Lihat detail ${item.name}`}
                >
                  {item.image ? (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <Package className="w-12 h-12 text-muted-foreground/50" aria-hidden />
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Satuan:{" "}
                      <span className="font-medium text-foreground">
                        {item.unit || "-"}
                      </span>
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
